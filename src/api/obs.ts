import http from './http';

export interface ObsBucketsResponse {
  buckets: string[];
}

export interface ObsDirectory {
  name: string;
  prefix: string;
}

export interface ObsObject {
  key: string;
  size: number;
  lastModified?: string;
  etag?: string;
  storageClass?: string;
}

export interface ObsListObjectsResponse {
  bucket: string;
  prefix: string;
  delimiter: string;
  directories: ObsDirectory[];
  objects: ObsObject[];
  isTruncated?: boolean;
  nextMarker?: string;
  nextContinuationToken?: string;
}

export interface FetchObsObjectsParams {
  bucket: string;
  prefix?: string;
  delimiter?: string;
  marker?: string;
  continuationToken?: string;
  signal?: AbortSignal;
}

const ensurePrefix = (prefix: string | undefined): string => {
  if (!prefix) return '';
  const trimmed = prefix.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeDirectory = (value: unknown): ObsDirectory | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name : typeof item.dir === 'string' ? item.dir : '';
  const prefix = ensurePrefix(
    typeof item.prefix === 'string' ? item.prefix : typeof item.path === 'string' ? item.path : name,
  );
  if (!name || !prefix) return null;
  return { name, prefix };
};

const normalizeObject = (value: unknown): ObsObject | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const key = typeof item.key === 'string' ? item.key : typeof item.Key === 'string' ? item.Key : '';
  if (!key) return null;
  return {
    key,
    size: toNumber(item.size),
    lastModified:
      typeof item.lastModified === 'string'
        ? item.lastModified
        : typeof item.last_modified === 'string'
          ? item.last_modified
          : undefined,
    etag: typeof item.etag === 'string' ? item.etag : undefined,
    storageClass:
      typeof item.storageClass === 'string'
        ? item.storageClass
        : typeof item.storage_class === 'string'
          ? item.storage_class
          : undefined,
  };
};

export const fetchObsBuckets = async (accountId: number, signal?: AbortSignal) => {
  const { data } = await http.get<ObsBucketsResponse>('/obs/buckets', {
    signal,
    params: {
      accountId,
    },
  });
  return data.buckets ?? [];
};

export const fetchObsObjects = async (params: FetchObsObjectsParams): Promise<ObsListObjectsResponse> => {
  const { data } = await http.get<ObsListObjectsResponse>('/obs/objects', {
    signal: params.signal,
    params: {
      bucket: params.bucket,
      prefix: ensurePrefix(params.prefix),
      delimiter: params.delimiter ?? '/',
      marker: params.marker,
      continuationToken: params.continuationToken,
    },
  });

  return {
    bucket: typeof data.bucket === 'string' ? data.bucket : params.bucket,
    prefix: ensurePrefix(typeof data.prefix === 'string' ? data.prefix : params.prefix),
    delimiter: typeof data.delimiter === 'string' ? data.delimiter : '/',
    directories: Array.isArray(data.directories) ? data.directories.map(normalizeDirectory).filter((item): item is ObsDirectory => item !== null) : [],
    objects: Array.isArray(data.objects) ? data.objects.map(normalizeObject).filter((item): item is ObsObject => item !== null) : [],
    isTruncated: Boolean(data.isTruncated),
    nextMarker: typeof data.nextMarker === 'string' ? data.nextMarker : undefined,
    nextContinuationToken:
      typeof data.nextContinuationToken === 'string' ? data.nextContinuationToken : undefined,
  };
};

export const normalizeObsPrefix = ensurePrefix;

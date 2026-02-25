import http from './http';
import type { MockObject, Task, TaskObject, TaskProgress } from '@/types/models';

export interface CreateTaskPayload {
  accountId: number;
  bucket: string;
  selection: {
    objects: string[];
  };
}

export interface FetchMockObjectsParams {
  accountId: number;
  bucket: string;
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface MockObjectsResponse {
  items: MockObject[];
  total: number;
}

interface TaskCreateApiResponse {
  taskId?: number;
  id?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const MAX_PARSE_DEPTH = 6;
const LIST_KEYS = ['items', 'records', 'list', 'content', 'rows', 'objectKeys', 'object_keys'];
const TOTAL_KEYS = ['total', 'totalCount', 'totalElements', 'count'];
const WRAPPER_KEYS = ['data', 'result', 'page', 'payload'];

const unwrapEnvelope = (value: unknown): unknown => {
  let current = value;
  for (let i = 0; i < MAX_PARSE_DEPTH; i += 1) {
    if (!isRecord(current)) return current;
    if ('code' in current && 'data' in current) {
      current = current.data;
      continue;
    }
    break;
  }
  return current;
};

const normalizeObjectItem = (item: unknown): MockObject | null => {
  if (typeof item === 'string' && item.trim()) {
    return {
      key: item,
      size: 0,
      lastModified: undefined,
    };
  }

  if (!isRecord(item)) return null;
  const key =
    item.key ??
    item.objectKey ??
    item.object_key ??
    item.objectName ??
    item.object_name ??
    item.name ??
    item.Key;
  if (typeof key !== 'string' || !key.trim()) return null;
  return {
    key,
    size: toNumber(item.size) ?? 0,
    lastModified:
      typeof item.lastModified === 'string'
        ? item.lastModified
        : typeof item.last_modified === 'string'
          ? item.last_modified
          : undefined,
  };
};

const pickTotal = (payload: Record<string, unknown>): number | undefined => {
  for (const totalKey of TOTAL_KEYS) {
    const num = toNumber(payload[totalKey]);
    if (num !== undefined) return num;
  }
  return undefined;
};

const extractListAndTotal = (
  payload: unknown,
  depth = 0,
): {
  list: unknown[];
  total?: number;
} => {
  const unwrapped = unwrapEnvelope(payload);
  if (Array.isArray(unwrapped)) return { list: unwrapped };
  if (!isRecord(unwrapped) || depth >= MAX_PARSE_DEPTH) return { list: [] };

  const directTotal = pickTotal(unwrapped);
  for (const listKey of LIST_KEYS) {
    const candidate = unwrapped[listKey];
    if (Array.isArray(candidate)) {
      return { list: candidate, total: directTotal };
    }
  }

  for (const wrapperKey of WRAPPER_KEYS) {
    if (!(wrapperKey in unwrapped)) continue;
    const nested = extractListAndTotal(unwrapped[wrapperKey], depth + 1);
    if (nested.list.length > 0) {
      return {
        list: nested.list,
        total: nested.total ?? directTotal,
      };
    }
  }

  return { list: [], total: directTotal };
};

const normalizeMockObjectsResponse = (payload: unknown): MockObjectsResponse => {
  const { list, total } = extractListAndTotal(payload);
  const items = list.map(normalizeObjectItem).filter((item): item is MockObject => item !== null);
  return {
    items,
    total: total ?? items.length,
  };
};

export const fetchTasks = async () => {
  const { data } = await http.get<Task[]>('/tasks');
  return data;
};

export const createTask = async (payload: CreateTaskPayload) => {
  const { data } = await http.post<TaskCreateApiResponse>('/tasks', payload);
  const taskId = typeof data.taskId === 'number' ? data.taskId : data.id;
  if (typeof taskId !== 'number') {
    throw new Error('创建任务返回数据格式错误，缺少 taskId');
  }
  return { taskId };
};

export const retryTask = async (taskId: number) => {
  const { data } = await http.post<TaskCreateApiResponse>(`/tasks/${taskId}/retry`, {});
  const newTaskId = typeof data.taskId === 'number' ? data.taskId : data.id;
  if (typeof newTaskId !== 'number') {
    throw new Error('重试任务返回数据格式错误，缺少 taskId');
  }
  return { taskId: newTaskId };
};

export const fetchTaskObjects = async (taskId: number, status?: string) => {
  const { data } = await http.get<TaskObject[]>(`/tasks/${taskId}/objects`);
  if (!status) return data;
  return data.filter((item) => item.status === status);
};

export const fetchTaskById = async (taskId: number) => {
  const { data } = await http.get<Task>(`/tasks/${taskId}`);
  return data;
};

export const fetchTaskProgress = async (taskId: number) => {
  const task = await fetchTaskById(taskId);
  const objects = Array.isArray(task.objects) ? task.objects : [];
  const done = objects.filter((item) => item.status === 'success' || item.status === 'failed').length;
  const total = objects.length;
  const progress: TaskProgress = { done, total };
  return progress;
};

export const fetchMockObjects = async (params: FetchMockObjectsParams) => {
  const { data } = await http.get<unknown>('/obs/objects', {
    params,
  });
  return normalizeMockObjectsResponse(data);
};

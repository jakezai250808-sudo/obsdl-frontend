import http from './http';
import type { Account } from '@/types/models';

export interface AccountPayload {
  name: string;
  email?: string;
  remark?: string;
  obsAccessKey?: string;
  obsSecretKey?: string;
  obsEndpoint?: string;
  obsBucket?: string;
  obsRegion?: string;
  obsProjectId?: string;
}

const normalizeAccount = (item: unknown): Account | null => {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') return null;

  return {
    id: raw.id,
    name: raw.name,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    remark: typeof raw.remark === 'string' ? raw.remark : undefined,
    obsAccessKey:
      typeof raw.obsAccessKey === 'string'
        ? raw.obsAccessKey
        : typeof raw.accessKey === 'string'
          ? raw.accessKey
          : undefined,
    obsSecretKey:
      typeof raw.obsSecretKey === 'string'
        ? raw.obsSecretKey
        : typeof raw.secretKey === 'string'
          ? raw.secretKey
          : undefined,
    obsEndpoint:
      typeof raw.obsEndpoint === 'string'
        ? raw.obsEndpoint
        : typeof raw.endpoint === 'string'
          ? raw.endpoint
          : undefined,
    obsBucket:
      typeof raw.obsBucket === 'string'
        ? raw.obsBucket
        : typeof raw.bucket === 'string'
          ? raw.bucket
          : undefined,
    obsRegion:
      typeof raw.obsRegion === 'string'
        ? raw.obsRegion
        : typeof raw.region === 'string'
          ? raw.region
          : undefined,
    obsProjectId:
      typeof raw.obsProjectId === 'string'
        ? raw.obsProjectId
        : typeof raw.projectId === 'string'
          ? raw.projectId
          : undefined,
  };
};

export const fetchAccounts = async () => {
  const { data } = await http.get<unknown>('/accounts');
  if (!Array.isArray(data)) return [];
  return data.map(normalizeAccount).filter((item): item is Account => item !== null);
};

export const createAccount = async (payload: AccountPayload) => {
  const { data } = await http.post<Account>('/accounts', payload);
  return data;
};

export const updateAccount = async (id: number, payload: AccountPayload) => {
  const { data } = await http.put<Account>(`/accounts/${id}`, payload);
  return data;
};

export const deleteAccount = async (id: number) => {
  await http.delete(`/accounts/${id}`);
};

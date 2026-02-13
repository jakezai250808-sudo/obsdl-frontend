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

export const fetchAccounts = async () => {
  const { data } = await http.get<Account[]>('/accounts');
  return data;
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

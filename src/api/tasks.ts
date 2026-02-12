import http from './http';
import type { MockObject, Task, TaskObject, TaskProgress } from '@/types/models';

export interface CreateTaskPayload {
  accountId: number;
  bucket: string;
  objectKeys: string[];
  targetPath: string;
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

export const fetchTasks = async () => {
  const { data } = await http.get<Task[]>('/tasks');
  return data;
};

export const createTask = async (payload: CreateTaskPayload) => {
  const { data } = await http.post<Task>('/tasks', payload);
  return data;
};

export const fetchTaskObjects = async (taskId: number, status?: string) => {
  const { data } = await http.get<TaskObject[]>(`/tasks/${taskId}/objects`, {
    params: status ? { status } : undefined,
  });
  return data;
};

export const fetchTaskProgress = async (taskId: number) => {
  const { data } = await http.get<TaskProgress>(`/tasks/${taskId}/progress`);
  return data;
};

export const fetchMockObjects = async (params: FetchMockObjectsParams) => {
  const { data } = await http.get<MockObjectsResponse>('/master/mock-objects', {
    params,
  });
  return data;
};

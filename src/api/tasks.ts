import http from './http';
import type { Task, TaskObject } from '@/types/models';

export interface CreateTaskPayload {
  name: string;
  accountId: number;
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

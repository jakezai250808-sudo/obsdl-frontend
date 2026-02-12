export interface Account {
  id: number;
  name: string;
  email: string;
  remark?: string;
}

export interface Task {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  accountId: number;
  createdAt: string;
}

export interface TaskObject {
  id: number;
  objectKey: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  size: number;
}

export interface Account {
  id: number;
  name: string;
  email: string;
  remark?: string;
}

export interface Task {
  id: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  accountId: number;
  bucket: string;
  targetPath: string;
  createdAt: string;
}

export interface TaskObject {
  id: number;
  objectKey: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  size: number;
}

export interface MockObject {
  key: string;
  size: number;
  lastModified?: string;
}

export interface TaskProgress {
  done: number;
  total: number;
}

import axios from 'axios';
import { ElMessage } from 'element-plus';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const http = axios.create({
  baseURL,
  timeout: 10000,
});

type ApiEnvelope<T = unknown> = {
  code: number;
  message?: string;
  data: T;
};

const isApiEnvelope = (value: unknown): value is ApiEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'number' && 'data' in candidate;
};

http.interceptors.response.use(
  (response) => {
    if (isApiEnvelope(response.data)) {
      if (response.data.code !== 0) {
        const error = new Error(response.data.message || '请求失败') as Error & {
          response?: { data?: unknown };
        };
        error.response = { data: response.data };
        return Promise.reject(error);
      }
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    const message = error?.response?.data?.message || (!error?.response ? '网络异常，请稍后重试' : error?.message) || '请求失败';
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

export default http;

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
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const message = error?.response?.data?.message || error?.message || '请求失败';
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

export default http;

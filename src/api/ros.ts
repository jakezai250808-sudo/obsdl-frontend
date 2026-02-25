import axios from 'axios';

export type RosVersion = 'ROS1' | 'ROS2';

export interface RosStartPayload {
  rosVersion: RosVersion;
  bagPath: string;
  loop: boolean;
  useSimTime: boolean;
  rate: number;
  port: number;
}

export interface RosStatusResponse {
  status: string;
  wsUrl?: string;
  vncUrl?: string;
  roscorePid?: number | null;
  bridgePid?: number | null;
  bagPid?: number | null;
  message?: string;
}

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '');

const resolveBaseUrl = (backendBaseUrl?: string) => {
  const input = (backendBaseUrl || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${trimTrailingSlash(input || origin)}/api/v1/ros`;
};

const buildHeaders = (token: string) => ({
  'X-CTRL-TOKEN': token,
});

export const rosStart = async (backendBaseUrl: string, token: string, payload: RosStartPayload) => {
  const { data } = await axios.post<RosStatusResponse>(`${resolveBaseUrl(backendBaseUrl)}/start`, payload, {
    headers: buildHeaders(token),
  });
  return data;
};

export const rosStop = async (backendBaseUrl: string, token: string) => {
  const { data } = await axios.post<RosStatusResponse>(`${resolveBaseUrl(backendBaseUrl)}/stop`, {}, {
    headers: buildHeaders(token),
  });
  return data;
};

export const rosStatus = async (backendBaseUrl: string, token: string) => {
  const { data } = await axios.get<RosStatusResponse>(`${resolveBaseUrl(backendBaseUrl)}/status`, {
    headers: buildHeaders(token),
  });
  return data;
};

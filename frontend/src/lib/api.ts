import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export type ApiError = {
  status?: number;
  code: string;
  message: string;
  details?: unknown;
  isNetwork: boolean;
};

type RawErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
};

const NETWORK_ERROR_MESSAGE =
  'Cannot connect to backend server. Please start backend on http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<RawErrorBody>) => {
    if (error.code === 'ERR_NETWORK' || !error.response) {
      const networkError: ApiError = {
        code: 'NETWORK_ERROR',
        message: NETWORK_ERROR_MESSAGE,
        isNetwork: true,
      };
      return Promise.reject(networkError);
    }

    const payload = error.response.data;

    const apiError: ApiError = {
      status: error.response.status,
      code: typeof payload?.code === 'string' ? payload.code : 'REQUEST_FAILED',
      message: typeof payload?.message === 'string' ? payload.message : 'Request failed',
      details: payload?.details,
      isNetwork: false,
    };

    return Promise.reject(apiError);
  },
);

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError<RawErrorBody>(error)) {
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: NETWORK_ERROR_MESSAGE,
        isNetwork: true,
      };
    }

    const payload = error.response.data;

    return {
      status: error.response.status,
      code: typeof payload?.code === 'string' ? payload.code : 'REQUEST_FAILED',
      message: typeof payload?.message === 'string' ? payload.message : 'Request failed',
      details: payload?.details,
      isNetwork: false,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      isNetwork: false,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Something went wrong',
    isNetwork: false,
  };
}

function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as Partial<ApiError>;
  return typeof maybe.code === 'string' && typeof maybe.message === 'string';
}

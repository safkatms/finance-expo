import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth.store';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.105:3000/api/v1';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request: attach token ──────────────────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response 1: cold-start retry ───────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as InternalAxiosRequestConfig & { __retryCount?: number };

    const isColdStart = !err.response || [502, 503, 504].includes(err.response.status ?? 0);
    const retryCount = config.__retryCount ?? 0;

    if (isColdStart && retryCount < 3 && config) {
      config.__retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, config.__retryCount! * 2000));
      return api(config);
    }

    return Promise.reject(err);
  },
);

// ── Response 2: 401 refresh flow ───────────────────────────────────────────
let refreshing: Promise<string> | null = null;

async function forceLogout() {
  await clearTokens();
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setAuthenticated(false);
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);

      if (!refreshToken) {
        await forceLogout();
        return Promise.reject(err);
      }

      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
            .then(async (r) => {
              const { accessToken, refreshToken: newRefresh } = r.data.data as {
                accessToken: string;
                refreshToken: string;
              };
              await setTokens(accessToken, newRefresh);
              return accessToken;
            })
            .finally(() => { refreshing = null; });
        }

        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await forceLogout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(err);
  },
);

export async function setTokens(access: string, refresh: string | null) {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  if (refresh !== null) {
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
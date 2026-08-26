import { api, setTokens, clearTokens } from './axios';
import type { ApiResponse, TokenResponse } from '@/types/api';
import type {
  LoginPayload,
  User,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from '@/types/auth';

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const res = await api.post<ApiResponse<TokenResponse>>('/auth/login', payload);
  const tokens = res.data.data!;
  await setTokens(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

export async function logout() {
  try {
    await api.post('/auth/logout'); // token still in SecureStore — interceptor attaches it
  } catch {
  }
  await clearTokens();
}

export async function getMe(): Promise<User> {
  const res = await api.get<ApiResponse<User>>('/user/me');
  return res.data.data!;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post('/auth/change-password', payload);
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await api.post('/auth/forgot-password', payload);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await api.post('/auth/reset-password', payload);
}
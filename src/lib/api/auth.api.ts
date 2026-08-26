import { api, setTokens, clearTokens } from '@/lib/axios';
import type { ApiResponse, TokenResponse } from '@/types/api';
import type { User } from '@/types/finance';

export async function login(email: string, password: string) {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: string; user: User }>>('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data.data!;
    await setTokens(accessToken, refreshToken);
    return user;
}

export async function logout() {
    try { await api.post('/auth/logout'); } finally { await clearTokens(); }
}

export async function changePassword(currentPassword: string, newPassword: string) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string) {
    await api.post('/auth/reset-password', { token, newPassword });
}

export async function getMe(): Promise<User> {
    const res = await api.get<ApiResponse<User>>('/users/me');
    return res.data.data!;
}
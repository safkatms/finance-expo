import { api, setTokens, clearTokens } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, TokenResponse } from '@/types/api';
import type { User } from '@/types/finance';
import { queryClient } from '../query-client';
export async function login(email: string, password: string) {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: string; user: User }>>('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data.data!;
    await setTokens(accessToken, refreshToken);
    return user;
}

export async function logout() {
    try { await api.post('/auth/logout'); } finally {
        await clearTokens();
        queryClient.clear();
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().setAuthenticated(false);
    }
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

export async function switchUser(userId: number): Promise<User> {
    const res = await api.post<ApiResponse<{ accessToken: string; expiresIn: string; impersonatedUser: User }>>(
        '/auth/switch-user',
        { userId },
    );
    const { accessToken, impersonatedUser } = res.data.data!;
    // Replace only the access token — no refresh token issued for impersonation
    await setTokens(accessToken, null);
    return impersonatedUser;
}
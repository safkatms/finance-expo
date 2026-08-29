import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { User, PaginatedData, PaginationMeta } from '@/types/finance';

export type UserItem = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
};

export type CreateUserPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: string;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export async function getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
}): Promise<PaginatedData<UserItem>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);

    const res = await api.get<{ data: UserItem[]; meta: PaginationMeta }>(
        `/users?${query.toString()}`,
    );
    return { data: res.data.data, meta: res.data.meta };
}

export async function getUserById(id: number): Promise<UserItem> {
    const res = await api.get<ApiResponse<UserItem>>(`/users/${id}`);
    return res.data.data!;
}

export async function createUser(payload: CreateUserPayload): Promise<{
    user: UserItem;
    temporaryPassword: string;
}> {
    const res = await api.post<ApiResponse<{ user: UserItem; temporaryPassword: string }>>(
        '/users',
        payload,
    );
    return res.data.data!;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserItem> {
    const res = await api.patch<ApiResponse<UserItem>>(`/users/${id}`, payload);
    return res.data.data!;
}

export async function toggleUserActive(id: number): Promise<UserItem> {
    const res = await api.patch<ApiResponse<UserItem>>(`/users/${id}/toggle-active`);
    return res.data.data!;
}

export async function resetUserOtp(id: number): Promise<{ temporaryPassword: string }> {
    const res = await api.post<ApiResponse<{ temporaryPassword: string }>>(
        `/users/${id}/reset-otp`,
    );
    return res.data.data!;
}

export async function deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
}

export async function getMe(): Promise<User> {
    const res = await api.get<ApiResponse<User>>('/users/me');
    return res.data.data!;
}
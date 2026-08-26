import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Category, PinnedCategory } from '@/types/finance';

export async function getCategories(): Promise<Category[]> {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data.data!;
}

export interface CreateCategoryPayload {
    name: string;
    applicableType?: string;
    parentId?: number;
    color?: string;
    icon?: string;
    description?: string;
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const res = await api.post<ApiResponse<Category>>('/categories', payload);
    return res.data.data!;
}

export async function updateCategory(id: number, payload: Partial<CreateCategoryPayload>): Promise<Category> {
    const res = await api.patch<ApiResponse<Category>>(`/categories/${id}`, payload);
    return res.data.data!;
}

export async function deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
}

// Pinned
export async function getPinnedCategories(month?: string): Promise<PinnedCategory[]> {
    const res = await api.get<ApiResponse<PinnedCategory[]>>('/pinned-categories', { params: month ? { month } : {} });
    return res.data.data!;
}

export async function pinCategory(categoryId: number): Promise<PinnedCategory[]> {
    const res = await api.post<ApiResponse<PinnedCategory[]>>(`/pinned-categories/${categoryId}`);
    return res.data.data!;
}

export async function unpinCategory(categoryId: number): Promise<PinnedCategory[]> {
    const res = await api.delete<ApiResponse<PinnedCategory[]>>(`/pinned-categories/${categoryId}`);
    return res.data.data!;
}

export async function setPinnedCategories(categoryIds: number[]): Promise<PinnedCategory[]> {
    const res = await api.put<ApiResponse<PinnedCategory[]>>('/pinned-categories', { categoryIds });
    return res.data.data!;
}
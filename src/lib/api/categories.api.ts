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

export interface PinnedCategoryListResponse {
    month: string;
    pinned: {
        id: number;
        categoryId: number;
        categoryName: string;
        icon: string | null;
        color: string | null;
        displayOrder: number;
        monthlyTotal: number;
    }[];
}

export async function getPinnedCategories(month?: string): Promise<PinnedCategoryListResponse> {
    const res = await api.get<ApiResponse<PinnedCategoryListResponse>>('/pinned-categories', {
        params: month ? { month } : {},
    });
    return res.data.data!;
}

export async function pinCategory(categoryId: number): Promise<PinnedCategoryListResponse> {
    const res = await api.post<ApiResponse<PinnedCategoryListResponse>>(`/pinned-categories/${categoryId}`);
    return res.data.data!;
}

export async function unpinCategory(categoryId: number): Promise<PinnedCategoryListResponse> {
    const res = await api.delete<ApiResponse<PinnedCategoryListResponse>>(`/pinned-categories/${categoryId}`);
    return res.data.data!;
}

export async function setPinnedCategories(categoryIds: number[]): Promise<PinnedCategoryListResponse> {
    const res = await api.put<ApiResponse<PinnedCategoryListResponse>>('/pinned-categories', { categoryIds });
    return res.data.data!;
}
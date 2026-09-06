import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { BudgetItem, MonthBudgetSummary } from '@/types/finance';

export interface CreateBudgetPayload {
    month: string;
    categoryId?: number;
    amount: number;
    notes?: string;
}

export interface UpdateBudgetPayload {
    amount?: number;
    notes?: string;
}

export interface CopyBudgetPayload {
    fromMonth: string;
    toMonth: string;
}

export async function getBudgetSummary(month: string): Promise<MonthBudgetSummary> {
    const res = await api.get<ApiResponse<MonthBudgetSummary>>('/budgets/summary', {
        params: { month },
    });
    return res.data.data!;
}

export async function createBudget(payload: CreateBudgetPayload): Promise<BudgetItem> {
    const res = await api.post<ApiResponse<BudgetItem>>('/budgets', payload);
    return res.data.data!;
}

export async function updateBudget(id: number, payload: UpdateBudgetPayload): Promise<BudgetItem> {
    const res = await api.patch<ApiResponse<BudgetItem>>(`/budgets/${id}`, payload);
    return res.data.data!;
}

export async function deleteBudget(id: number): Promise<void> {
    await api.delete(`/budgets/${id}`);
}

export async function copyBudget(payload: CopyBudgetPayload): Promise<{ copied: number; skipped: number }> {
    const res = await api.post<ApiResponse<{ copied: number; skipped: number }>>('/budgets/copy', payload);
    return res.data.data!;
}
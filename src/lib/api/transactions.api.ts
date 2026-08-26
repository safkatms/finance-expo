import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Transaction, PaginatedData } from '@/types/finance';

export interface TransactionFilter {
    page?: number;
    limit?: number;
    type?: string;
    categoryId?: number;
    accountId?: number;
    month?: string;
    startDate?: string;
    endDate?: string;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<PaginatedData<Transaction>> {
    const res = await api.get<ApiResponse<PaginatedData<Transaction>>>('/transactions', { params: filter });
    return res.data.data!;
}

export async function getTransaction(id: number): Promise<Transaction> {
    const res = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return res.data.data!;
}

export async function getTransactionsByMonth(month: string, filter: Omit<TransactionFilter, 'month'> = {}): Promise<PaginatedData<Transaction>> {
    const res = await api.get<ApiResponse<PaginatedData<Transaction>>>(`/transactions/by-month/${month}`, { params: filter });
    return res.data.data!;
}

export interface CreateTransactionPayload {
    txnDate: string;        // ISO date string
    type: string;
    amount: number;
    categoryId?: number;
    fromAccountId?: number;
    toAccountId?: number;
    description?: string;
    note?: string;
    referenceNumber?: string;
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    const res = await api.post<ApiResponse<Transaction>>('/transactions', payload);
    return res.data.data!;
}

export async function updateTransaction(id: number, payload: Partial<CreateTransactionPayload>): Promise<Transaction> {
    const res = await api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, payload);
    return res.data.data!;
}

export async function deleteTransaction(id: number): Promise<void> {
    await api.delete(`/transactions/${id}`);
}

export async function getMonthlySummary() {
    const res = await api.get<ApiResponse<any>>('/transactions/summary/monthly');
    return res.data.data!;
}

export async function getCategoryBreakdown(month: string) {
    const res = await api.get<ApiResponse<any>>('/transactions/summary/categories', { params: { month } });
    return res.data.data!;
}
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
    fromDate?: string;
    toDate?: string;
    search?: string;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<PaginatedData<Transaction>> {
    const res = await api.get<ApiResponse<PaginatedData<Transaction>>>('/transactions', { params: filter });
    return res.data.data!;
}

export async function getTransaction(id: number): Promise<Transaction> {
    const res = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return res.data.data!;
}

export interface CreateTransactionPayload {
    txnDate: string;
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
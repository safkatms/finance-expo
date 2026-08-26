import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Account } from '@/types/finance';

interface AccountsResponse {
    accounts: Account[];
    netWorth: number;
}

export async function getAccounts(): Promise<Account[]> {
    const res = await api.get<ApiResponse<AccountsResponse>>('/accounts');
    return res.data.data!.accounts;
}

export async function getAccountsWithNetWorth(): Promise<AccountsResponse> {
    const res = await api.get<ApiResponse<AccountsResponse>>('/accounts');
    return res.data.data!;
}

export async function getAccount(id: number): Promise<Account> {
    const res = await api.get<ApiResponse<Account>>(`/accounts/${id}`);
    return res.data.data!;
}

export interface CreateAccountPayload {
    name: string;
    accountType: string;
    institution?: string;
    openingBalance?: number;
    currency?: string;
    color?: string;
    notes?: string;
    includeInNetWorth?: boolean;
}

export async function createAccount(payload: CreateAccountPayload): Promise<Account> {
    const res = await api.post<ApiResponse<Account>>('/accounts', payload);
    return res.data.data!;
}

export async function updateAccount(id: number, payload: Partial<CreateAccountPayload>): Promise<Account> {
    const res = await api.patch<ApiResponse<Account>>(`/accounts/${id}`, payload);
    return res.data.data!;
}

export async function deleteAccount(id: number): Promise<void> {
    await api.delete(`/accounts/${id}`);
}

export async function setDefaultAccount(id: number): Promise<Account> {
    const res = await api.patch<ApiResponse<Account>>(`/accounts/${id}/set-default`);
    return res.data.data!;
}

export async function toggleNetWorth(id: number): Promise<Account> {
    const res = await api.patch<ApiResponse<Account>>(`/accounts/${id}/toggle-net-worth`);
    return res.data.data!;
}

export type ReorderAccountItem = {
    id: number;
    displayOrder: number;
};

export async function reorderAccounts(
    accounts: ReorderAccountItem[],
) {
    return api.patch("/accounts/reorder", {
        accounts,
    });
}
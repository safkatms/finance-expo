import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export interface ImportResult {
    rowsOk: number;
    rowsSkipped: number;
    rowsFailed: number;
    errors: string[];
}

export interface ImportJob {
    id: number;
    type: string;
    status: string;
    rowsOk: number;
    rowsSkipped: number;
    rowsFailed: number;
    errors: string[];
    createdAt: string;
}

async function uploadFile(endpoint: string, file: { uri: string; name: string; type: string }): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    const res = await api.post<ApiResponse<ImportResult>>(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data!;
}

export const importAccounts = (file: { uri: string; name: string; type: string }) =>
    uploadFile('/import/accounts', file);

export const importLoans = (file: { uri: string; name: string; type: string }) =>
    uploadFile('/import/loans', file);

export const importMonthly = (file: { uri: string; name: string; type: string }) =>
    uploadFile('/import/monthly', file);

export const importLoanPayments = (file: { uri: string; name: string; type: string }) =>
    uploadFile('/import/loan-payments', file);

export async function getImportHistory(): Promise<ImportJob[]> {
    const res = await api.get<ApiResponse<ImportJob[]>>('/import/history');
    return res.data.data!;
}

export async function getImportJob(id: number): Promise<ImportJob> {
    const res = await api.get<ApiResponse<ImportJob>>(`/import/${id}`);
    return res.data.data!;
}
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Loan, LoanSummary, PaginatedData } from '@/types/finance';

export interface LoanFilter {
    page?: number;
    limit?: number;
    status?: string;
    direction?: string;
}

export async function getLoans(filter: LoanFilter = {}): Promise<PaginatedData<Loan>> {
    const res = await api.get<ApiResponse<PaginatedData<Loan>>>('/loans', { params: filter });
    return res.data.data!;
}

export async function getLoan(id: number): Promise<Loan> {
    const res = await api.get<ApiResponse<Loan>>(`/loans/${id}`);
    return res.data.data!;
}

export async function getLoanSummary(): Promise<LoanSummary> {
    const res = await api.get<ApiResponse<LoanSummary>>('/loans/summary');
    return res.data.data!;
}

export interface CreateLoanPayload {
    loanDate: string;
    direction: string;
    personName: string;
    personPhone?: string;
    amount: number;
    accountId: number;
    dueDate?: string;
    purpose?: string;
    notes?: string;
}

export async function createLoan(payload: CreateLoanPayload): Promise<Loan> {
    const res = await api.post<ApiResponse<Loan>>('/loans', payload);
    return res.data.data!;
}

export async function updateLoan(id: number, payload: Pick<CreateLoanPayload, 'dueDate' | 'purpose' | 'notes'>): Promise<Loan> {
    const res = await api.patch<ApiResponse<Loan>>(`/loans/${id}`, payload);
    return res.data.data!;
}

export interface CreateLoanPaymentPayload {
    paymentDate: string;
    amount: number;
    accountId: number;
    isFinal?: boolean;
    note?: string;
}

export async function recordLoanPayment(loanId: number, payload: CreateLoanPaymentPayload): Promise<Loan> {
    const res = await api.post<ApiResponse<Loan>>(`/loans/${loanId}/payments`, payload);
    return res.data.data!;
}

export async function deleteLoan(id: number): Promise<void> {
    await api.delete(`/loans/${id}`);
}
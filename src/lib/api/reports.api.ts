import { api, API_BASE_URL, getAccessToken } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { AccountStatement } from '@/types/finance';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';

export interface MonthlyPnlRow {
    month: string;
    income: number;
    expense: number;
    savings: number;
}

export interface CategoryBreakdownItem {
    category: { id: number; name: string; icon: string | null; color: string | null } | null;
    amount: number;
    percentage: number;
}

export interface CategoryBreakdownResult {
    total: number;
    items: CategoryBreakdownItem[];
}

export interface AccountHistoryEntry {
    period: string;
    credit: number;
    debit: number;
    net: number;
    closingBalance: number;
}

export interface AccountBalanceHistory {
    account: {
        id: number;
        name: string;
        accountType: string;
        color: string | null;
        openingBalance: number;
    };
    openingBalance: number;
    history: AccountHistoryEntry[];
}

export interface LoanSummaryItem {
    id: number;
    direction: 'Gave' | 'Received';
    personName: string;
    amount: number;
    outstanding: number;
    totalPaid: number;
    status: string;
    dueDate: string | null;
    isOverdue: boolean;
    account: { id: number; name: string };
    loanDate: string;
}

export interface LoanSummaryResult {
    summary: {
        totalGaveOutstanding: number;
        totalReceivedOutstanding: number;
        netPosition: number;
        totalOverdue: number;
    };
    items: LoanSummaryItem[];
}

export interface DateRangeParams {
    fromMonth?: string;
    toMonth?: string;
    fromDate?: string;
    toDate?: string;
}

export interface CategoryBreakdownParams extends DateRangeParams {
    month?: string;
}

export interface AccountHistoryParams {
    accountId?: number;
    fromMonth?: string;
    toMonth?: string;
}

export interface AccountStatementParams {
    accountId: number;
    fromDate?: string;
    toDate?: string;
}

export async function getMonthlyPnl(params?: DateRangeParams): Promise<MonthlyPnlRow[]> {
    const res = await api.get<ApiResponse<MonthlyPnlRow[]>>('/reports/monthly-pnl', { params });
    return res.data.data!;
}

export async function getCategoryBreakdown(params?: CategoryBreakdownParams): Promise<CategoryBreakdownResult> {
    const res = await api.get<ApiResponse<CategoryBreakdownResult>>('/reports/category-breakdown', { params });
    return res.data.data!;
}

export async function getAccountBalanceHistory(params?: AccountHistoryParams): Promise<AccountBalanceHistory[]> {
    const res = await api.get<ApiResponse<AccountBalanceHistory[]>>('/reports/account-balance-history', { params });
    return res.data.data!;
}

export async function getAccountStatement(params: AccountStatementParams): Promise<AccountStatement> {
    const res = await api.get<ApiResponse<AccountStatement>>('/reports/account-statement', { params });
    return res.data.data!;
}

export async function getLoanSummary(): Promise<LoanSummaryResult> {
    const res = await api.get<ApiResponse<LoanSummaryResult>>('/reports/loan-summary');
    return res.data.data!;
}

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

async function downloadAndSharePdf(url: string, filename: string): Promise<void> {
    const token = await getAccessToken();
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const blob = await response.blob();
    const bytes = await blobToUint8Array(blob);
    const file = new File(Paths.document, filename);
    await file.write(bytes);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
}

export async function openAccountStatementPdf(params: AccountStatementParams): Promise<void> {
    const q = new URLSearchParams();
    q.set('accountId', String(params.accountId));
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    await downloadAndSharePdf(
        `${API_BASE_URL}/reports/account-statement/pdf?${q}`,
        `statement-${Date.now()}.pdf`,
    );
}

export async function openAccountBalanceHistoryPdf(params: AccountHistoryParams): Promise<void> {
    const q = new URLSearchParams();
    if (params.accountId) q.set('accountId', String(params.accountId));
    if (params.fromMonth) q.set('fromMonth', params.fromMonth);
    if (params.toMonth) q.set('toMonth', params.toMonth);
    await downloadAndSharePdf(
        `${API_BASE_URL}/reports/account-balance-history/pdf?${q}`,
        `balance-history-${Date.now()}.pdf`,
    );
}
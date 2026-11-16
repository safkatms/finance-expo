import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
    SavingsEntry,
    SavingsEntryType,
    SavingsMode,
    SavingsOverview,
    SavingsPlan,
} from '@/types/finance';

export interface CreateSavingsPlanPayload {
    year: number;
    mode: SavingsMode;
    monthlyTarget?: number;
    yearlyTarget?: number;
    notes?: string;
}

// null clears a target, undefined leaves it unchanged
export interface UpdateSavingsPlanPayload {
    mode?: SavingsMode;
    monthlyTarget?: number | null;
    yearlyTarget?: number | null;
    notes?: string | null;
}

export interface RenewSavingsPlanPayload {
    year: number;
    keepTargets: boolean;
    mode?: SavingsMode;
    monthlyTarget?: number | null;
    yearlyTarget?: number | null;
}

export interface CreateSavingsEntryPayload {
    entryDate: string; // yyyy-MM-dd
    type: SavingsEntryType;
    amount: number;
    accountId: number;
    note?: string;
}

export interface SavingsEntryFilter {
    year?: number;
    month?: string;
    accountId?: number;
}

export async function getSavingsOverview(year: number, month?: string): Promise<SavingsOverview> {
    const res = await api.get<ApiResponse<SavingsOverview>>('/savings/overview', {
        params: { year, ...(month && { month }) },
    });
    return res.data.data!;
}

export async function getSavingsPlans(): Promise<SavingsPlan[]> {
    const res = await api.get<ApiResponse<SavingsPlan[]>>('/savings/plans');
    return res.data.data!;
}

export async function createSavingsPlan(payload: CreateSavingsPlanPayload): Promise<SavingsPlan> {
    const res = await api.post<ApiResponse<SavingsPlan>>('/savings/plans', payload);
    return res.data.data!;
}

export async function renewSavingsPlan(payload: RenewSavingsPlanPayload): Promise<SavingsPlan> {
    const res = await api.post<ApiResponse<SavingsPlan>>('/savings/plans/renew', payload);
    return res.data.data!;
}

export async function updateSavingsPlan(id: number, payload: UpdateSavingsPlanPayload): Promise<SavingsPlan> {
    const res = await api.patch<ApiResponse<SavingsPlan>>(`/savings/plans/${id}`, payload);
    return res.data.data!;
}

export async function deleteSavingsPlan(id: number): Promise<void> {
    await api.delete(`/savings/plans/${id}`);
}

export async function getSavingsEntries(filter: SavingsEntryFilter = {}): Promise<SavingsEntry[]> {
    const res = await api.get<ApiResponse<SavingsEntry[]>>('/savings/entries', { params: filter });
    return res.data.data!;
}

export async function createSavingsEntry(payload: CreateSavingsEntryPayload): Promise<SavingsEntry> {
    const res = await api.post<ApiResponse<SavingsEntry>>('/savings/entries', payload);
    return res.data.data!;
}

export async function deleteSavingsEntry(id: number): Promise<void> {
    await api.delete(`/savings/entries/${id}`);
}

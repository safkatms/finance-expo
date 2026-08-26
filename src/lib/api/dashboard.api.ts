import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardData } from '@/types/finance';

export async function getDashboard(month?: string): Promise<DashboardData> {
    const res = await api.get<ApiResponse<DashboardData>>('/dashboard', {
        params: month ? { month } : {},
    });
    return res.data.data!;
}

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { ApiResponse } from '../types/api';

export function useWeeks() {
  return useQuery({
    queryKey: ['sales', 'weeks'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<string[]>>('/sales/weeks');
      return res.data.data ?? [];
    },
  });
}

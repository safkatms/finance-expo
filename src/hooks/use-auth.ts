import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMe } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';

export function useMe() {
    const { isAuthenticated, setUser } = useAuthStore();

    const query = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: getMe,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 10, // 10 min
    });

    useEffect(() => {
        if (query.data) setUser(query.data);
    }, [query.data]);

    return query;
}
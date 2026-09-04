import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { getAccessToken } from "@/lib/axios";
import { getMe } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { getDashboard } from "@/lib/api/dashboard.api";

import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setAuthenticated, setLoading, setUser } = useAuthStore();

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        try {
          const user = await getMe();
          setUser(user);
          setAuthenticated(true);
          queryClient.prefetchQuery({
            queryKey: ["dashboard"],
            queryFn: () => getDashboard(),
          });
        } catch {
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
      await SplashScreen.hideAsync();
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="index" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

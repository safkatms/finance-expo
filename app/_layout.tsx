import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { getAccessToken, api } from "@/lib/axios";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { flushQueue } from "@/lib/offline-queue";
import { useNetInfo } from "@react-native-community/netinfo";
import { View, Text } from "react-native";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
    },
  },
});

export default function RootLayout() {
  const { setAuthenticated, setLoading } = useAuthStore();
  const netInfo = useNetInfo();

  // Replace the token check useEffect with:
  useEffect(() => {
    getAccessToken().then(async (token) => {
      setAuthenticated(!!token);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let wasConnected: boolean | null = null;

    const unsub = NetInfo.addEventListener((state) => {
      const isNowConnected = !!state.isConnected;
      if (isNowConnected && wasConnected === false) {
        flushQueue(api, () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
        });
      }
      wasConnected = isNowConnected;
    });

    return unsub;
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <SafeAreaProvider>
        {!netInfo.isConnected && (
          <View
            style={{
              backgroundColor: "#f59e0b",
              padding: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              You're offline — showing cached data
            </Text>
          </View>
        )}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="index" />
        </Stack>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { BottomNav } from '@/components/layout/BottomNav';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});

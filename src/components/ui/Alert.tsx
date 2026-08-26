import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

interface Props {
  message?: string;
  type?: 'error' | 'success';
}

export function Alert({ message, type = 'error' }: Props) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <View style={[styles.container, isError ? styles.error : styles.success]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  error: {
    backgroundColor: colors.red[50],
    borderColor: '#FECACA',
  },
  success: {
    backgroundColor: colors.green[50],
    borderColor: '#BBF7D0',
  },
  text: { fontSize: 13, fontWeight: '600' },
  errorText: { color: colors.red[600] },
  successText: { color: colors.green[600] },
});

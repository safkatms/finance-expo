import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { colors } from './theme';

interface Props extends TouchableOpacityProps {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  color?: string;
}

export function Button({ children, loading, variant = 'primary', color, style, disabled, ...props }: Props) {
  const bg = color ?? colors.indigo[600];
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' ? { backgroundColor: bg } : styles.ghost,
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : bg} />
      ) : (
        <Text style={[styles.text, variant === 'ghost' ? { color: colors.gray[700] } : null]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ghost: {
    backgroundColor: colors.gray[100],
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disabled: { opacity: 0.5 },
});

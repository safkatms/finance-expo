import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from './theme';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function Spinner({ size = 'large', color = colors.indigo[600], fullScreen }: Props) {
  if (fullScreen) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={color} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
});

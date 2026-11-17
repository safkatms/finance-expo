import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/components/ui/theme";

export function ProgressBar({
  pct,
  color,
  track,
  height = 6,
}: {
  pct: number;
  color: string;
  track?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <View style={[s.bg, { height }, track ? { backgroundColor: track } : null]}>
      <View style={[s.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  bg: { backgroundColor: colors.gray[100], borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});

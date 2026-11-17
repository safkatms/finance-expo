import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { ProgressBar } from "./ProgressBar";
import { fmt, progressColor, remainingLabel } from "./format";

/**
 * One consistent layout for weekly / monthly / yearly progress:
 * label + saved amount, then (only when a target exists) a bar with "% of target" and what's left.
 */
export function ProgressRow({
  label,
  sublabel,
  saved,
  target,
  percent,
  size = "sm",
  highlight,
  muted,
  onPress,
}: {
  label: string;
  sublabel?: string;
  saved: number;
  target: number | null;
  percent: number | null;
  size?: "sm" | "lg";
  highlight?: boolean;
  muted?: boolean;
  onPress?: () => void;
}) {
  const showBar = target !== null && percent !== null;
  const remaining = remainingLabel(saved, target);
  const reached = showBar && percent! >= 100;
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
      style={[s.row, highlight && s.highlight, muted && { opacity: 0.5 }]}
    >
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={size === "lg" ? s.labelLg : s.label}>{label}</Text>
          {sublabel ? <Text style={s.sub}>{sublabel}</Text> : null}
        </View>
        <Text
          style={[
            size === "lg" ? s.valueLg : s.value,
            { color: saved < 0 ? colors.red[500] : colors.gray[900] },
          ]}
        >
          {fmt(saved)}
        </Text>
        {onPress && <Feather name="chevron-right" size={16} color={colors.gray[300]} />}
      </View>

      {showBar && (
        <>
          <ProgressBar pct={percent!} color={progressColor(percent!)} height={size === "lg" ? 8 : 6} />
          <View style={s.bottom}>
            <Text style={s.meta}>
              {percent}% of {fmt(target!)}
            </Text>
            {remaining && (
              <Text style={[s.meta, reached && { color: colors.green[600], fontWeight: "700" }]}>
                {remaining}
              </Text>
            )}
          </View>
        </>
      )}
    </Wrapper>
  );
}

const s = StyleSheet.create({
  row: { gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10 },
  highlight: { backgroundColor: colors.teal[50] },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
  labelLg: { fontSize: 14, fontWeight: "700", color: colors.gray[800] },
  sub: { fontSize: 11, color: colors.gray[400] },
  value: { fontSize: 14, fontWeight: "800" },
  valueLg: { fontSize: 18, fontWeight: "800" },
  bottom: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 11, color: colors.gray[500] },
});

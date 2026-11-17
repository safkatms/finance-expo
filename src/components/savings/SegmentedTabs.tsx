import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/components/ui/theme";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.track}>
        {tabs.map((t) => {
          const selected = t.key === value;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, selected && s.tabSelected]}
              onPress={() => onChange(t.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[s.label, selected && s.labelSelected]} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  track: {
    flexDirection: "row",
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabSelected: { backgroundColor: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  labelSelected: { fontWeight: "800", color: colors.teal[700] },
});

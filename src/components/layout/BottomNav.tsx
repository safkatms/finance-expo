import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../ui/theme";

const nav = [
  { href: "/(app)/dashboard", label: "Dashboard", icon: "home" },
  { href: "/(app)/sales/add", label: "Add Sales", icon: "plus-circle" },
  { href: "/(app)/sales/weekly", label: "Weekly", icon: "calendar" },
  { href: "/(app)/sales/monthly", label: "Monthly", icon: "bar-chart-2" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {nav.map(({ href, label, icon }) => {
        const active =
          pathname === href.replace("/(app)", "") ||
          pathname.startsWith(href.replace("/(app)", "") + "/");
        return (
          <TouchableOpacity
            key={href}
            style={styles.tab}
            onPress={() => {
              if (!active) router.push(href as any);
            }}
            activeOpacity={0.7}
          >
            <Feather
              name={icon as any}
              size={22}
              color={active ? colors.indigo[600] : colors.gray[400]}
            />
            <Text
              style={[
                styles.label,
                active ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 8,
    gap: 3,
  },
  label: { fontSize: 10, fontWeight: "500" },
  labelActive: { color: colors.indigo[600] },
  labelInactive: { color: colors.gray[400] },
});

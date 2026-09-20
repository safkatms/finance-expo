// (app)/settings.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

import { PageHeader } from "@/components/ui/PageHeader";
import { colors } from "@/components/ui/theme";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/auth";
import { setTokens } from "@/lib/axios";
import { useQueryClient } from "@tanstack/react-query";

type SettingItem = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  chevron?: boolean;
};

function SettingRow({ item }: { item: SettingItem }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: item.destructive
              ? colors.red[50]
              : colors.teal[50],
          },
        ]}
      >
        <Feather
          name={item.icon}
          size={17}
          color={item.destructive ? colors.red[500] : colors.teal[600]}
        />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowLabel,
            item.destructive && { color: colors.red[500] },
          ]}
        >
          {item.label}
        </Text>
        {item.sublabel && (
          <Text style={styles.rowSublabel}>{item.sublabel}</Text>
        )}
      </View>
      {item.chevron !== false && (
        <Feather
          name="chevron-right"
          size={16}
          color={item.destructive ? colors.red[300] : colors.gray[300]}
        />
      )}
    </TouchableOpacity>
  );
}

function SectionCard({ items }: { items: SettingItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <SettingRow item={item} />
          {index < items.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const {
    user,
    setAuthenticated,
    setUser,
    originalAdmin,
    adminToken,
    clearImpersonation,
  } = useAuthStore();

  const isAdmin = user?.role === "admin";
  const isImpersonating = !!originalAdmin && !!adminToken;

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          setAuthenticated(false);
          setUser(null);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleExitImpersonation = async () => {
    try {
      await setTokens(adminToken!, null);
      setUser(originalAdmin);
      clearImpersonation();
      await qc.invalidateQueries();
      router.back();
    } catch {
      await logout();
      setAuthenticated(false);
      setUser(null);
      router.replace("/(auth)/login");
    }
  };

  const adminItems: SettingItem[] = [
    {
      icon: "users",
      label: "Manage users",
      sublabel: "Create, edit and deactivate users",
      onPress: () => router.push("/(app)/admin/users"),
      chevron: true,
    },
    {
      icon: "repeat",
      label: "Switch user",
      sublabel: "View the app as another user",
      onPress: () => router.push("/(app)/switch-user"),
      chevron: true,
    },
  ];

  const accountItems: SettingItem[] = [
    {
      icon: "user",
      label: "Edit profile",
      sublabel: "Name, phone, timezone and preferences",
      onPress: () => router.push("/(app)/profile"),
      chevron: true,
    },
    {
      icon: "lock",
      label: "Change password",
      sublabel: "Update your login password",
      onPress: () => router.push("/(app)/change-password"),
      chevron: true,
    },
  ];
  const dataItems: SettingItem[] = [
    {
      icon: "upload",
      label: "Import transactions",
      sublabel: "Import from Excel or CSV",
      onPress: () => router.push("/(app)/import"),
      chevron: true,
    },
  ];
  const dangerItems: SettingItem[] = [
    ...(isImpersonating
      ? [
          {
            icon: "log-out" as const,
            label: "Exit impersonation",
            sublabel: `Return to ${originalAdmin?.firstName ?? "admin"} account`,
            onPress: handleExitImpersonation,
            destructive: true,
            chevron: false,
          },
        ]
      : []),
    {
      icon: "log-out",
      label: "Log out",
      onPress: handleLogout,
      destructive: true,
      chevron: false,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PageHeader title="Settings" variant="teal" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] ?? ""}
              {user?.lastName?.[0] ?? ""}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: isAdmin ? colors.teal[50] : colors.gray[100],
              },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: isAdmin ? colors.teal[700] : colors.gray[500] },
              ]}
            >
              {user?.role}
            </Text>
          </View>
        </View>

        {isImpersonating && (
          <View style={styles.impersonationBanner}>
            <Feather name="eye" size={14} color={colors.teal[700]} />
            <Text style={styles.impersonationText}>
              Viewing as {user?.firstName} {user?.lastName}
            </Text>
          </View>
        )}

        {/* Admin section */}
        {isAdmin && !isImpersonating && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADMIN</Text>
            <SectionCard items={adminItems} />
          </View>
        )}
        {/* Data section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <SectionCard items={dataItems} />
        </View>
        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <SectionCard items={accountItems} />
        </View>

        {/* Danger section */}
        <View style={styles.section}>
          <SectionCard items={dangerItems} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: 16, gap: 8 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    borderWidth: 1,
    borderColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800", color: colors.teal[700] },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: "700", color: colors.gray[900] },
  profileEmail: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: "800" },

  impersonationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.teal[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.teal[100],
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 8,
  },
  impersonationText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.teal[700],
  },

  section: { gap: 6 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1.2,
    marginLeft: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  rowSublabel: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
});

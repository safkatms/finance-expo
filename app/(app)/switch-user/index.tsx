import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAccessToken } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { switchUser } from "@/lib/api/auth.api";
import { getUsers, type UserItem } from "@/lib/api/users.api";

export default function SwitchUserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, setOriginalAdmin, setAdminToken, clearImpersonation } =
    useAuthStore();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const result = await getUsers({ limit: 50 });
      return result.data;
    },
  });

  const handleSwitch = async (target: UserItem) => {
    setSwitchingId(target.id);
    try {
      const adminToken = await getAccessToken();
      setOriginalAdmin(user);
      setAdminToken(adminToken);

      const impersonated = await switchUser(target.id);
      setUser(impersonated);
      await queryClient.invalidateQueries();
      router.replace("/(app)/dashboard");
    } catch {
      clearImpersonation();
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Switch user</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal[600]} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {getApiErrorMessage(error, "Failed to load users")}
          </Text>
        </View>
      )}

      {data && (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isSwitching = switchingId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.userRow,
                  !item.isActive && styles.userRowInactive,
                ]}
                onPress={() => handleSwitch(item)}
                disabled={!!switchingId || !item.isActive}
                activeOpacity={0.75}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.firstName[0]}
                    {item.lastName[0]}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                <View style={styles.userMeta}>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          item.role === "admin"
                            ? colors.teal[50]
                            : colors.gray[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        {
                          color:
                            item.role === "admin"
                              ? colors.teal[700]
                              : colors.gray[600],
                        },
                      ]}
                    >
                      {item.role}
                    </Text>
                  </View>
                  {!item.isActive && (
                    <Text style={styles.inactiveText}>Inactive</Text>
                  )}
                </View>
                {isSwitching ? (
                  <ActivityIndicator size="small" color={colors.teal[600]} />
                ) : (
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={item.isActive ? colors.gray[400] : colors.gray[200]}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: colors.red[500], fontSize: 14 },
  list: { padding: 16, gap: 0 },
  separator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  userRowInactive: { opacity: 0.45 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "800", color: colors.teal[700] },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  userEmail: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  userMeta: { alignItems: "flex-end", gap: 3 },
  roleBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { fontSize: 10, fontWeight: "800" },
  inactiveText: { fontSize: 10, color: colors.red[400], fontWeight: "600" },
});

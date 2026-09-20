// (app)/admin/users/index.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";

import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getUsers,
  toggleUserActive,
  deleteUser,
  resetUserOtp,
  type UserItem,
} from "@/lib/api/users.api";
import { OtpRevealModal } from "@/components/ui/OtpRevealModal";

function initialsOf(u: UserItem) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <View
      style={[
        s.roleBadge,
        { backgroundColor: isAdmin ? colors.teal[50] : colors.gray[100] },
      ]}
    >
      <Text
        style={[
          s.roleText,
          { color: isAdmin ? colors.teal[700] : colors.gray[500] },
        ]}
      >
        {role}
      </Text>
    </View>
  );
}

function UserCard({
  user,
  onEdit,
  onToggleActive,
  onResetOtp,
  onDelete,
  actionPending,
}: {
  user: UserItem;
  onEdit: () => void;
  onToggleActive: () => void;
  onResetOtp: () => void;
  onDelete: () => void;
  actionPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.cardMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initialsOf(user)}</Text>
        </View>

        <View style={s.userInfo}>
          <View style={s.nameRow}>
            <Text style={s.userName} numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            {!user.isActive && (
              <View style={s.inactiveBadge}>
                <Text style={s.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={s.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
        </View>

        <View style={s.cardRight}>
          <RoleBadge role={user.role} />
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.gray[400]}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.cardActions}>
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={onEdit}
              disabled={actionPending}
            >
              <Feather name="edit-2" size={13} color={colors.teal[600]} />
              <Text style={[s.actionLabel, { color: colors.teal[600] }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={onToggleActive}
              disabled={actionPending}
            >
              <Feather
                name={user.isActive ? "user-x" : "user-check"}
                size={13}
                color={user.isActive ? colors.amber[500] : colors.teal[600]}
              />
              <Text
                style={[
                  s.actionLabel,
                  {
                    color: user.isActive ? colors.amber[500] : colors.teal[600],
                  },
                ]}
              >
                {user.isActive ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={onResetOtp}
              disabled={actionPending}
            >
              <Feather name="key" size={13} color={colors.gray[500]} />
              <Text style={[s.actionLabel, { color: colors.gray[500] }]}>
                Reset OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={onDelete}
              disabled={actionPending}
            >
              <Feather name="trash-2" size={13} color={colors.red[500]} />
              <Text style={[s.actionLabel, { color: colors.red[500] }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>

          {actionPending && (
            <ActivityIndicator
              size="small"
              color={colors.teal[500]}
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    password: string;
    name: string;
  }>({ visible: false, password: "", name: "" });

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => getUsers({ limit: 50, search: search || undefined }),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => toggleUserActive(id),
    onMutate: (id) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to update user")),
  });

  const resetOtpMut = useMutation({
    mutationFn: (id: number) => resetUserOtp(id),
    onMutate: (id) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (res, id) => {
      const user = data?.data.find((u) => u.id === id);
      setOtpModal({
        visible: true,
        password: res.temporaryPassword,
        name: user ? `${user.firstName} ${user.lastName}` : "User",
      });
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to reset OTP")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onMutate: (id) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to delete user")),
  });

  const confirmDelete = useCallback(
    (user: UserItem) => {
      Alert.alert(
        "Delete User",
        `Delete ${user.firstName} ${user.lastName}? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMut.mutate(user.id),
          },
        ],
      );
    },
    [deleteMut],
  );

  const users = data?.data ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Users"
        variant="teal"
        rightActions={[
          {
            icon: "user-plus",
            onPress: () => router.push("/(app)/admin/users/form"),
          },
        ]}
      />

      {/* Search bar */}
      <View style={s.searchWrap}>
        <View style={s.searchRow}>
          <Feather name="search" size={15} color={colors.gray[400]} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or email…"
            placeholderTextColor={colors.gray[400]}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load users")}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={[
            s.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.teal[600]]}
              tintColor={colors.teal[600]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Feather name="users" size={26} color={colors.teal[400]} />
              </View>
              <Text style={s.emptyText}>
                {search ? "No users match your search" : "No users yet"}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => router.push("/(app)/admin/users/form")}
                >
                  <Feather name="user-plus" size={14} color="#fff" />
                  <Text style={s.emptyBtnLabel}>Add user</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <UserCard
              user={item}
              actionPending={pendingId === item.id}
              onEdit={() =>
                router.push({
                  pathname: "/(app)/admin/users/form",
                  params: { id: item.id },
                })
              }
              onToggleActive={() => toggleMut.mutate(item.id)}
              onResetOtp={() => resetOtpMut.mutate(item.id)}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <OtpRevealModal
        visible={otpModal.visible}
        password={otpModal.password}
        userName={otpModal.name}
        onClose={() => setOtpModal((s) => ({ ...s, visible: false }))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray[50],
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[900],
  },

  list: { padding: 16 },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  avatarText: { fontSize: 13, fontWeight: "800", color: colors.teal[700] },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
  },
  userEmail: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 6 },

  roleBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: "800" },

  inactiveBadge: {
    backgroundColor: colors.red[50],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.red[500],
  },

  cardActions: {
    borderTopWidth: 1,
    borderTopColor: colors.teal[50],
    backgroundColor: colors.gray[50],
    padding: 14,
    gap: 8,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },

  empty: { alignItems: "center", gap: 14, paddingTop: 60 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  emptyText: { fontSize: 14, color: colors.gray[400], fontWeight: "600" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});

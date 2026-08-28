import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getCategories,
  pinCategory,
  unpinCategory,
  getPinnedCategories,
  PinnedCategoryListResponse,
} from "@/lib/api/categories.api";
import { deleteCategory } from "@/lib/api/categories.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import type { Category } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const TYPE_COLORS: Record<string, string> = {
  Income: colors.green[500],
  Expense: colors.red[500],
  Transfer: colors.indigo[400],
};

function CategoryCard({
  category,
  isPinned,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  category: Category;
  isPinned: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = category.color ?? colors.indigo[500];
  const typeColor = category.applicableType
    ? TYPE_COLORS[category.applicableType]
    : colors.gray[400];

  return (
    <View style={s.catCard}>
      <TouchableOpacity
        style={s.catMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={[s.catIcon, { backgroundColor: accentColor + "18" }]}>
          <Text style={s.catEmoji}>{category.icon ?? "📁"}</Text>
        </View>
        <View style={s.catInfo}>
          <View style={s.catNameRow}>
            <Text style={s.catName} numberOfLines={1}>
              {category.name}
            </Text>
            {category.isSystem && (
              <View style={s.sysBadge}>
                <Text style={s.sysBadgeText}>System</Text>
              </View>
            )}
          </View>
          {category.applicableType && (
            <Text style={[s.catType, { color: typeColor }]}>
              {category.applicableType}
            </Text>
          )}
        </View>
        <View style={s.catRight}>
          {isPinned && (
            <Feather name="bookmark" size={14} color={colors.indigo[500]} />
          )}
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.gray[400]}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.catActions}>
          {category.description ? (
            <Text style={s.catDesc}>{category.description}</Text>
          ) : null}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={onTogglePin}>
              <Feather
                name={isPinned ? "bookmark" : "bookmark"}
                size={13}
                color={isPinned ? colors.red[500] : colors.indigo[600]}
              />
              <Text
                style={[
                  s.actionLabel,
                  { color: isPinned ? colors.red[500] : colors.indigo[600] },
                ]}
              >
                {isPinned ? "Unpin" : "Pin"}
              </Text>
            </TouchableOpacity>

            {!category.isSystem && (
              <>
                <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
                  <Feather name="edit-2" size={13} color={colors.indigo[600]} />
                  <Text style={[s.actionLabel, { color: colors.indigo[600] }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={onDelete}>
                  <Feather name="trash-2" size={13} color={colors.red[500]} />
                  <Text style={[s.actionLabel, { color: colors.red[500] }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"All" | "Income" | "Expense">("All");

  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: pinnedData } = useQuery<PinnedCategoryListResponse>({
    queryKey: ["pinned-categories"],
    queryFn: () => getPinnedCategories(),
  });

  const pinnedIds = new Set(
    (pinnedData?.pinned ?? []).map((p) => p.categoryId),
  );

  const pinMut = useMutation({
    mutationFn: pinCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinned-categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to pin category")),
  });

  const unpinMut = useMutation({
    mutationFn: unpinCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinned-categories"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to unpin category")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to delete")),
  });

  const confirmDelete = (cat: Category) => {
    Alert.alert("Delete Category", `Delete "${cat.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(cat.id),
      },
    ]);
  };

  const filtered = (categories ?? []).filter((c) =>
    filter === "All" ? true : c.applicableType === filter,
  );

  const pinnedList = pinnedData?.pinned ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Categories</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/categories/form")}
          hitSlop={8}
        >
          <Feather name="plus" size={22} color={colors.indigo[600]} />
        </TouchableOpacity>
      </View>

      {/* Pinned summary */}
      {pinnedList.length > 0 && (
        <View style={s.pinnedBanner}>
          <Feather name="bookmark" size={13} color={colors.indigo[500]} />
          <Text style={s.pinnedBannerText}>
            {pinnedList.length} pinned · shown on dashboard
          </Text>
        </View>
      )}

      {/* Filter */}
      <View style={s.filterRow}>
        {(["All", "Income", "Expense"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterChipLabel,
                filter === f && s.filterChipLabelActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load categories")}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Feather name="tag" size={40} color={colors.gray[300]} />
              <Text style={s.emptyText}>No categories</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/(app)/categories/form")}
              >
                <Text style={s.emptyBtnLabel}>Add Category</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                isPinned={pinnedIds.has(cat.id)}
                onEdit={() =>
                  router.push({
                    pathname: "/(app)/categories/form",
                    params: { id: cat.id },
                  })
                }
                onDelete={() => confirmDelete(cat)}
                onTogglePin={() =>
                  pinnedIds.has(cat.id)
                    ? unpinMut.mutate(cat.id)
                    : pinMut.mutate(cat.id)
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.gray[900] },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.indigo[50],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.indigo[100],
  },
  pinnedBannerText: {
    fontSize: 12,
    color: colors.indigo[600],
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  filterChipActive: {
    borderColor: colors.indigo[500],
    backgroundColor: colors.indigo[50],
  },
  filterChipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  filterChipLabelActive: { color: colors.indigo[600] },
  list: { padding: 16, gap: 10 },
  catCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  catMain: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  catEmoji: { fontSize: 18 },
  catInfo: { flex: 1 },
  catNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  sysBadge: {
    backgroundColor: colors.gray[100],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sysBadgeText: { fontSize: 10, fontWeight: "600", color: colors.gray[500] },
  catType: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  catRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  catActions: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    padding: 14,
    gap: 10,
  },
  catDesc: { fontSize: 12, color: colors.gray[500] },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.gray[400], fontWeight: "600" },
  emptyBtn: {
    backgroundColor: colors.indigo[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.indigo[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});

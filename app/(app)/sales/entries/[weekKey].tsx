import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";
interface SalesEntry {
  id: number;
  type: "SALE" | "PAYMENT" | "RETURN";
  amount: number;
  entryDate: string;
  note: string | null;
  weekKey: string;
}

const fmt = (v: number) =>
  `৳${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TYPE_COLOR: Record<string, string> = {
  SALE: colors.indigo[600],
  PAYMENT: colors.green[600],
  RETURN: colors.orange[500],
};
const TYPE_BG: Record<string, string> = {
  SALE: colors.indigo[50],
  PAYMENT: colors.green[50],
  RETURN: "#FFF7ED",
};
const TYPE_LABEL: Record<string, string> = {
  SALE: "Sale",
  PAYMENT: "Payment",
  RETURN: "Return",
};

function EditModal({
  entry,
  onClose,
  onSave,
  saving,
}: {
  entry: SalesEntry;
  onClose: () => void;
  onSave: (id: number, amount: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(String(entry.amount));
  const accent = TYPE_COLOR[entry.type];

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modal.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={modal.sheet}>
          {/* Sheet handle */}
          <View style={modal.handle} />

          <View style={modal.header}>
            <View>
              <Text style={modal.title}>Edit Entry</Text>
              <Text style={modal.subtitle}>
                {TYPE_LABEL[entry.type]} · {fmtDate(entry.entryDate)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              style={modal.closeBtn}
            >
              <Feather name="x" size={18} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Amount field */}
          <View style={modal.fieldWrap}>
            <Text style={modal.currencyLabel}>BDT</Text>
            <TextInput
              style={[modal.input, { borderColor: accent }]}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              autoFocus
              placeholderTextColor={colors.gray[400]}
            />
          </View>

          <View style={modal.actions}>
            <TouchableOpacity
              style={modal.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.saveBtn, { backgroundColor: accent }]}
              onPress={() => onSave(entry.id, parseFloat(value))}
              activeOpacity={0.7}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={modal.saveText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function WeekEntriesScreen() {
  const { weekKey } = useLocalSearchParams<{ weekKey: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [editEntry, setEditEntry] = useState<SalesEntry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    data: entries,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sales", "entries", weekKey],
    queryFn: async () => {
      const res = await api.get<{ data: SalesEntry[] }>(
        `/sales/entries?weekKey=${weekKey}`,
      );
      return res.data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sales", "entries", weekKey] });
    queryClient.invalidateQueries({ queryKey: ["sales", "summary", "weekly"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      api.patch(`/sales/${id}`, { amount }),
    onSuccess: () => {
      invalidate();
      setEditEntry(null);
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sales/${id}`),
    onSuccess: () => {
      invalidate();
      setDeletingId(null);
    },
    onError: (e) => {
      setDeletingId(null);
      setErrorMsg(getApiErrorMessage(e));
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const count = entries?.length ?? 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={colors.gray[700]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{weekKey}</Text>
          <Text style={styles.headerSub}>
            {count} {count === 1 ? "entry" : "entries"}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <Spinner fullScreen />
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Alert message={getApiErrorMessage(error)} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.indigo[600]]}
            />
          }
        >
          {errorMsg ? <Alert message={errorMsg} /> : null}

          {!entries?.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyBody}>
                Sales, payments, and returns for this week will appear here.
              </Text>
            </View>
          ) : (
            entries.map((entry) => {
              const accent = TYPE_COLOR[entry.type];
              const bg = TYPE_BG[entry.type];
              const isDeleting = deletingId === entry.id;

              return (
                <View key={entry.id} style={styles.entryCard}>
                  {/* Left accent strip */}
                  <View
                    style={[styles.accentStrip, { backgroundColor: accent }]}
                  />

                  <View style={styles.entryInner}>
                    {/* Top row: pill + amount */}
                    <View style={styles.entryTop}>
                      <View style={[styles.typePill, { backgroundColor: bg }]}>
                        <Text style={[styles.typePillText, { color: accent }]}>
                          {TYPE_LABEL[entry.type]}
                        </Text>
                      </View>
                      <Text style={[styles.entryAmount, { color: accent }]}>
                        {fmt(entry.amount)}
                      </Text>
                    </View>

                    {/* Bottom row: date + actions */}
                    <View style={styles.entryBottom}>
                      <Text style={styles.entryDate}>
                        {fmtDate(entry.entryDate)}
                      </Text>
                      {entry.note ? (
                        <Text style={styles.entryNote}>{entry.note}</Text>
                      ) : null}
                      <View style={styles.entryActions}>
                        <TouchableOpacity
                          onPress={() => setEditEntry(entry)}
                          hitSlop={8}
                          style={styles.actionBtn}
                        >
                          <Feather
                            name="edit"
                            size={14}
                            color={colors.gray[400]}
                          />
                          <Text style={styles.actionLabel}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.actionDivider} />
                        <TouchableOpacity
                          onPress={() => {
                            setDeletingId(entry.id);
                            deleteMutation.mutate(entry.id);
                          }}
                          hitSlop={8}
                          disabled={isDeleting}
                          style={styles.actionBtn}
                        >
                          {isDeleting ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.red[500]}
                            />
                          ) : (
                            <>
                              <Feather
                                name="trash-2"
                                size={14}
                                color={colors.red[500]}
                              />
                              <Text style={styles.actionLabelDanger}>
                                Delete
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {editEntry && (
        <EditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={(id, amount) => updateMutation.mutate({ id, amount })}
          saving={updateMutation.isPending}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  headerSub: { fontSize: 11, color: colors.gray[400], marginTop: 1 },

  scrollContent: { padding: 16, gap: 10, paddingBottom: 40 },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[700] },
  emptyBody: {
    fontSize: 13,
    color: colors.gray[400],
    textAlign: "center",
    lineHeight: 19,
  },

  // Entry card
  entryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accentStrip: { width: 4 },
  entryInner: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },

  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typePill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typePillText: { fontSize: 11, fontWeight: "700" },
  entryAmount: { fontSize: 16, fontWeight: "800" },

  entryBottom: { gap: 6 },
  entryDate: { fontSize: 12, color: colors.gray[400] },
  entryNote: { fontSize: 12, color: colors.gray[400], fontStyle: "italic" },

  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[400] },
  actionLabelDanger: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.red[500],
  },
  actionDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.gray[200],
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
    gap: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.gray[900] },
  subtitle: { fontSize: 12, color: colors.gray[400], marginTop: 3 },

  fieldWrap: { gap: 8 },
  currencyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: "800",
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },

  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: colors.gray[500] },
  saveBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getTransactions, deleteTransaction } from "@/lib/api/transactions.api";
import { getCategories } from "@/lib/api/categories.api";
import { getAccounts } from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import type { Transaction, TxnType } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PageHeader } from "@/components/ui/PageHeader";

const TYPE_COLORS: Record<TxnType, string> = {
  Income: colors.green[500],
  Expense: colors.red[500],
  Transfer: colors.teal[400],
};
const TYPE_PREFIX: Record<TxnType, string> = {
  Income: "+",
  Expense: "-",
  Transfer: "",
};
const TYPES = [
  { label: "All", value: "" },
  { label: "Income", value: "Income" },
  { label: "Expense", value: "Expense" },
  { label: "Transfer", value: "Transfer" },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currentMonth() {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

function shiftMonth(month: string, delta: number): string {
  const parts = month.split("-");
  const idx = MONTH_NAMES.indexOf(parts[0]);
  const d = new Date(parseInt(parts[1], 10), idx + delta, 1);
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

const fmt = (v: number | string) =>
  `৳${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// ─── Filter state type ───────────────────────────────────────────────────────
interface Filters {
  mode: "month" | "range"; // month picker vs custom date range
  month: string;
  fromDate: string;
  toDate: string;
  type: string;
  categoryId: number | undefined;
  accountId: number | undefined;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  mode: "month",
  month: currentMonth(),
  fromDate: "",
  toDate: "",
  type: "",
  categoryId: undefined,
  accountId: undefined,
  search: "",
};

function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.type) n++;
  if (f.categoryId) n++;
  if (f.accountId) n++;
  if (f.mode === "range" && (f.fromDate || f.toDate)) n++;
  return n;
}

// ─── Picker Modal ────────────────────────────────────────────────────────────
function PickerModal<T extends { id: number | string; name: string }>({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  allowAll,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selected: number | string | undefined;
  onSelect: (id: number | undefined) => void;
  onClose: () => void;
  allowAll?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={pm.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          ListHeaderComponent={
            allowAll ? (
              <TouchableOpacity
                style={[pm.item, !selected && pm.itemActive]}
                onPress={() => {
                  onSelect(undefined);
                  onClose();
                }}
              >
                <Text style={[pm.itemText, !selected && pm.itemTextActive]}>
                  All
                </Text>
                {!selected && (
                  <Feather name="check" size={16} color={colors.teal[600]} />
                )}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pm.item, selected === item.id && pm.itemActive]}
              onPress={() => {
                onSelect(item.id as number);
                onClose();
              }}
            >
              <Text
                style={[pm.itemText, selected === item.id && pm.itemTextActive]}
              >
                {item.name}
              </Text>
              {selected === item.id && (
                <Feather name="check" size={16} color={colors.teal[600]} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────
function FilterSheet({
  visible,
  filters,
  draft,
  setDraft,
  onApply,
  onClose,
  categories,
  accounts,
  onOpenCat,
  onOpenAcc,
}: {
  visible: boolean;
  filters: Filters;
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: (f: Filters) => void;
  onClose: () => void;
  categories: { id: number; name: string }[];
  accounts: { id: number; name: string }[];
  onOpenCat: () => void;
  onOpenAcc: () => void;
}) {
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);

  React.useEffect(() => {
    if (visible) setPickerTarget(null);
  }, [visible]);

  const set = (patch: Partial<Filters>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const thisMon = currentMonth();

  const handlePickerChange = (_: any, date?: Date) => {
    if (Platform.OS === "android") setPickerTarget(null);
    if (!date || !pickerTarget) return;
    if (pickerTarget === "from") set({ fromDate: fmtDate(date) });
    else set({ toDate: fmtDate(date) });
  };

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function fmtDate(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function displayFmt(iso: string) {
    if (!iso) return "Select";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const fromDate = draft.fromDate ? new Date(draft.fromDate) : new Date();
  const toDate = draft.toDate ? new Date(draft.toDate) : new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={pm.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[pm.sheet, { paddingBottom: 32 }]}>
        <View style={pm.handle} />
        <View style={fs.headerRow}>
          <Text style={pm.title}>Filters</Text>
          <TouchableOpacity
            onPress={() => {
              setDraft(DEFAULT_FILTERS);
              setPickerTarget(null);
            }}
          >
            <Text style={fs.resetText}>Reset all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={fs.sectionLabel}>DATE MODE</Text>
          <View style={fs.segmented}>
            {(["month", "range"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[fs.segment, draft.mode === m && fs.segmentActive]}
                onPress={() => {
                  set({ mode: m });
                  setPickerTarget(null);
                }}
              >
                <Text
                  style={[
                    fs.segmentText,
                    draft.mode === m && fs.segmentTextActive,
                  ]}
                >
                  {m === "month" ? "Month" : "Date Range"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {draft.mode === "month" ? (
            <>
              <Text style={fs.sectionLabel}>MONTH</Text>
              <View style={fs.monthRow}>
                <TouchableOpacity
                  onPress={() => set({ month: shiftMonth(draft.month, -1) })}
                  style={fs.monthArrow}
                >
                  <Feather
                    name="chevron-left"
                    size={20}
                    color={colors.teal[600]}
                  />
                </TouchableOpacity>
                <Text style={fs.monthLabel}>{draft.month}</Text>
                <TouchableOpacity
                  onPress={() => set({ month: shiftMonth(draft.month, 1) })}
                  style={fs.monthArrow}
                  disabled={draft.month === thisMon}
                >
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={
                      draft.month === thisMon
                        ? colors.gray[300]
                        : colors.teal[600]
                    }
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={fs.sectionLabel}>DATE RANGE</Text>
              <View style={fs.customRow}>
                <TouchableOpacity
                  style={fs.datePicker}
                  onPress={() =>
                    setPickerTarget(pickerTarget === "from" ? null : "from")
                  }
                >
                  <Feather name="calendar" size={14} color={colors.teal[600]} />
                  <View>
                    <Text style={fs.datePickerLabel}>From</Text>
                    <Text style={fs.datePickerValue}>
                      {displayFmt(draft.fromDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={colors.gray[400]}
                />
                <TouchableOpacity
                  style={fs.datePicker}
                  onPress={() =>
                    setPickerTarget(pickerTarget === "to" ? null : "to")
                  }
                >
                  <Feather name="calendar" size={14} color={colors.teal[600]} />
                  <View>
                    <Text style={fs.datePickerLabel}>To</Text>
                    <Text style={fs.datePickerValue}>
                      {displayFmt(draft.toDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              {pickerTarget && Platform.OS === "android" && (
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={pickerTarget === "from" ? fromDate : toDate}
                  onChange={handlePickerChange}
                  maximumDate={pickerTarget === "from" ? toDate : new Date()}
                  minimumDate={pickerTarget === "to" ? fromDate : undefined}
                />
              )}
            </>
          )}

          <Text style={fs.sectionLabel}>TYPE</Text>
          <View style={fs.chipRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[fs.chip, draft.type === t.value && fs.chipActive]}
                onPress={() => set({ type: t.value })}
              >
                <Text
                  style={[
                    fs.chipText,
                    draft.type === t.value && fs.chipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={fs.sectionLabel}>CATEGORY</Text>
          <TouchableOpacity style={fs.selectBtn} onPress={onOpenCat}>
            <Text
              style={
                draft.categoryId ? fs.selectBtnValue : fs.selectBtnPlaceholder
              }
            >
              {draft.categoryId
                ? (categories.find((c) => c.id === draft.categoryId)?.name ??
                  "Select")
                : "All Categories"}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.gray[400]} />
          </TouchableOpacity>

          <Text style={fs.sectionLabel}>ACCOUNT</Text>
          <TouchableOpacity style={fs.selectBtn} onPress={onOpenAcc}>
            <Text
              style={
                draft.accountId ? fs.selectBtnValue : fs.selectBtnPlaceholder
              }
            >
              {draft.accountId
                ? (accounts.find((a) => a.id === draft.accountId)?.name ??
                  "Select")
                : "All Accounts"}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={fs.applyBtn}
          onPress={() => {
            onApply(draft);
            onClose();
            setPickerTarget(null);
          }}
        >
          <Text style={fs.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── TxnCard (unchanged) ──────────────────────────────────────────────────────
function TxnCard({
  txn,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const amtColor = TYPE_COLORS[txn.type];
  const prefix = TYPE_PREFIX[txn.type];

  const label =
    txn.description ??
    txn.category?.name ??
    (txn.type === "Transfer"
      ? `${txn.fromAccount?.name ?? ""} → ${txn.toAccount?.name ?? ""}`
      : txn.type);

  const subLabel =
    txn.type === "Income"
      ? `To: ${txn.toAccount?.name ?? "—"}`
      : txn.type === "Expense"
        ? `From: ${txn.fromAccount?.name ?? "—"}`
        : `${txn.fromAccount?.name ?? "—"} → ${txn.toAccount?.name ?? "—"}`;

  return (
    <View style={s.txnCard}>
      <TouchableOpacity
        style={s.txnMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.txnIcon,
            { backgroundColor: (txn.category?.color ?? amtColor) + "18" },
          ]}
        >
          <Text style={s.txnEmoji}>{txn.category?.icon ?? "💸"}</Text>
        </View>
        <View style={s.txnInfo}>
          <Text style={s.txnLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={s.txnSub} numberOfLines={1}>
            {new Date(txn.txnDate).toLocaleDateString()} · {subLabel}
          </Text>
        </View>
        <View style={s.txnRight}>
          <Text style={[s.txnAmount, { color: amtColor }]}>
            {prefix}
            {fmt(txn.amount)}
          </Text>
          <View style={[s.typeBadge, { backgroundColor: amtColor + "18" }]}>
            <Text style={[s.typeBadgeText, { color: amtColor }]}>
              {txn.type}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.txnExpanded}>
          {txn.note ? (
            <Text style={s.expandedNote}>Note: {txn.note}</Text>
          ) : null}
          {txn.referenceNumber ? (
            <Text style={s.expandedNote}>Ref: {txn.referenceNumber}</Text>
          ) : null}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
              <Feather name="edit-2" size={14} color={colors.teal[600]} />
              <Text style={[s.actionLabel, { color: colors.teal[600] }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={onDelete}>
              <Feather name="trash-2" size={14} color={colors.red[500]} />
              <Text style={[s.actionLabel, { color: colors.red[500] }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [accPickerOpen, setAccPickerOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);

  React.useEffect(() => {
    if (filterOpen) setDraft(filters);
  }, [filterOpen]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: getAccounts,
  });

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {
      page,
      limit: 20,
      type: filters.type || undefined,
      categoryId: filters.categoryId,
      accountId: filters.accountId,
      search: filters.search || undefined,
    };
    if (filters.mode === "month") {
      p.month = filters.month;
    } else {
      p.fromDate = filters.fromDate || undefined;
      p.toDate = filters.toDate || undefined;
    }
    return p;
  }, [filters, page]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["transactions", queryParams],
    queryFn: () => getTransactions(queryParams as any),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const confirmDelete = (txn: Transaction) => {
    Alert.alert(
      "Delete Transaction",
      `Delete this ${txn.type} of ${fmt(txn.amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(txn.id),
        },
      ],
    );
  };

  const txns = data?.data ?? [];
  const meta = data?.meta;
  const filterCount = activeFilterCount(filters);

  // Displayed date label in hero
  const dateLabel =
    filters.mode === "month"
      ? filters.month
      : [filters.fromDate, filters.toDate].filter(Boolean).join(" → ") ||
        "All dates";

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <PageHeader
        title="Transactions"
        variant="teal"
        rightActions={[
          {
            icon: "sliders",
            onPress: () => setFilterOpen(true),
            badge: filterCount,
          },
          {
            icon: "plus",
            onPress: () => router.push("/(app)/transactions/form"),
          },
        ]}
      />
      {/* Month Bar (only in month mode) */}
      {filters.mode === "month" && (
        <View style={s.monthBar}>
          <TouchableOpacity
            onPress={() => {
              setFilters((f) => ({ ...f, month: shiftMonth(f.month, -1) }));
              setPage(1);
            }}
            hitSlop={8}
            style={s.monthArrow}
          >
            <Feather name="chevron-left" size={20} color={colors.teal[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilters((f) => ({ ...f, month: currentMonth() }))}
            style={s.monthLabelWrap}
          >
            <Text style={s.monthLabel}>{filters.month}</Text>
            {filters.month !== currentMonth() && (
              <Text style={s.monthReset}>Tap to reset</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setFilters((f) => ({ ...f, month: shiftMonth(f.month, 1) }));
              setPage(1);
            }}
            hitSlop={8}
            style={s.monthArrow}
            disabled={filters.month === currentMonth()}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={
                filters.month === currentMonth()
                  ? colors.gray[300]
                  : colors.teal[600]
              }
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Active filter chips */}
      {filterCount > 0 && (
        <View style={s.activeChipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.activeChipsContent}
          >
            {filters.type && (
              <View style={s.activeChip}>
                <Text style={s.activeChipText}>{filters.type}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((f) => ({ ...f, type: "" }));
                    setPage(1);
                  }}
                  hitSlop={4}
                >
                  <Feather name="x" size={12} color={colors.teal[600]} />
                </TouchableOpacity>
              </View>
            )}
            {filters.categoryId && (
              <View style={s.activeChip}>
                <Text style={s.activeChipText}>
                  {categories.find((c) => c.id === filters.categoryId)?.name ??
                    "Category"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((f) => ({ ...f, categoryId: undefined }));
                    setPage(1);
                  }}
                  hitSlop={4}
                >
                  <Feather name="x" size={12} color={colors.teal[600]} />
                </TouchableOpacity>
              </View>
            )}
            {filters.accountId && (
              <View style={s.activeChip}>
                <Text style={s.activeChipText}>
                  {accounts.find((a) => a.id === filters.accountId)?.name ??
                    "Account"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((f) => ({ ...f, accountId: undefined }));
                    setPage(1);
                  }}
                  hitSlop={4}
                >
                  <Feather name="x" size={12} color={colors.teal[600]} />
                </TouchableOpacity>
              </View>
            )}
            {filters.mode === "range" &&
              (filters.fromDate || filters.toDate) && (
                <View style={s.activeChip}>
                  <Text style={s.activeChipText}>{dateLabel}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setFilters((f) => ({
                        ...f,
                        mode: "month",
                        month: currentMonth(),
                        fromDate: "",
                        toDate: "",
                      }));
                      setPage(1);
                    }}
                    hitSlop={4}
                  >
                    <Feather name="x" size={12} color={colors.teal[600]} />
                  </TouchableOpacity>
                </View>
              )}
          </ScrollView>
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Feather
          name="search"
          size={15}
          color={colors.gray[400]}
          style={s.searchIcon}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Search transactions…"
          placeholderTextColor={colors.gray[300]}
          value={filters.search}
          onChangeText={(v) => {
            setFilters((f) => ({ ...f, search: v }));
            setPage(1);
          }}
          returnKeyType="search"
        />
        {filters.search ? (
          <TouchableOpacity
            onPress={() => {
              setFilters((f) => ({ ...f, search: "" }));
              setPage(1);
            }}
            hitSlop={8}
          >
            <Feather name="x" size={15} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load")}
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
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.teal[600]]}
              tintColor={colors.teal[600]}
            />
          }
        >
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroHeader}>
              <View style={s.heroIconBadge}>
                <Feather name="activity" size={22} color="#fff" />
              </View>
              <View style={s.heroTextBlock}>
                <Text style={s.heroEyebrow}>MONTHLY OVERVIEW</Text>
                <Text style={s.heroTitle}>Transactions</Text>
                <Text style={s.heroSub}>{dateLabel}</Text>
              </View>
            </View>

            {data?.summary && (
              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatLabel}>Income</Text>
                  <Text style={[s.heroStatValue, { color: "#99F6E4" }]}>
                    {fmt(data.summary.income)}
                  </Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatLabel}>Expense</Text>
                  <Text style={[s.heroStatValue, { color: "#FCA5A5" }]}>
                    {fmt(data.summary.expense)}
                  </Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatLabel}>Savings</Text>
                  <Text
                    style={[
                      s.heroStatValue,
                      {
                        color:
                          data.summary.savings >= 0 ? "#BAE6FD" : "#FCA5A5",
                      },
                    ]}
                  >
                    {fmt(data.summary.savings)}
                  </Text>
                </View>
              </View>
            )}

            <View style={s.heroFooter}>
              <View style={s.heroStatus}>
                <View style={s.heroDot} />
                <Text style={s.heroStatusText}>
                  {txns.length} transactions shown
                </Text>
              </View>
              {meta && <Text style={s.heroTotal}>{meta.totalItems} total</Text>}
            </View>
          </View>

          {txns.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Feather name="inbox" size={28} color={colors.teal[400]} />
              </View>
              <Text style={s.emptyText}>No transactions found</Text>
            </View>
          ) : (
            txns.map((txn) => (
              <TxnCard
                key={txn.id}
                txn={txn}
                onEdit={() =>
                  router.push({
                    pathname: "/(app)/transactions/form",
                    params: { id: txn.id },
                  })
                }
                onDelete={() => confirmDelete(txn)}
              />
            ))
          )}

          {meta && meta.totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={page === 1 ? colors.gray[300] : colors.teal[600]}
                />
              </TouchableOpacity>
              <Text style={s.pageLabel}>
                {page} / {meta.totalPages}
              </Text>
              <TouchableOpacity
                style={[
                  s.pageBtn,
                  page === meta.totalPages && s.pageBtnDisabled,
                ]}
                onPress={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={
                    page === meta.totalPages
                      ? colors.gray[300]
                      : colors.teal[600]
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        draft={draft}
        setDraft={setDraft}
        onApply={(f) => {
          setFilters(f);
          setPage(1);
        }}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        accounts={accounts}
        onOpenCat={() => setCatPickerOpen(true)}
        onOpenAcc={() => setAccPickerOpen(true)}
      />

      <PickerModal
        visible={catPickerOpen}
        title="Select Category"
        items={categories}
        selected={draft.categoryId}
        onSelect={(id) => setDraft((d) => ({ ...d, categoryId: id }))}
        onClose={() => setCatPickerOpen(false)}
        allowAll
      />
      <PickerModal
        visible={accPickerOpen}
        title="Select Account"
        items={accounts}
        selected={draft.accountId}
        onSelect={(id) => setDraft((d) => ({ ...d, accountId: id }))}
        onClose={() => setAccPickerOpen(false)}
        allowAll
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray[900],
    marginBottom: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemActive: { backgroundColor: colors.teal[50] },
  itemText: { fontSize: 15, color: colors.gray[700] },
  itemTextActive: { color: colors.teal[600], fontWeight: "700" },
});

const fs = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  resetText: { fontSize: 13, color: colors.teal[600], fontWeight: "600" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.gray[100],
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  segmentTextActive: { color: colors.teal[600] },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 8,
  },
  monthArrow: { padding: 10 },
  monthLabel: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  rangeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rangeField: { flex: 1 },
  rangeFieldLabel: {
    fontSize: 11,
    color: colors.gray[500],
    fontWeight: "600",
    marginBottom: 6,
  },
  rangeInput: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray[900],
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipActive: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  chipTextActive: { color: colors.teal[600] },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectBtnValue: { fontSize: 14, color: colors.gray[900], fontWeight: "600" },
  selectBtnPlaceholder: { fontSize: 14, color: colors.gray[400] },
  applyBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  datePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerLabel: { fontSize: 10, fontWeight: "600", color: colors.gray[400] },
  datePickerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[900],
    marginTop: 1,
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red[500],
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  monthArrow: { padding: 8 },
  monthLabelWrap: { alignItems: "center" },
  monthLabel: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  monthReset: { fontSize: 10, color: colors.teal[400], marginTop: 1 },
  activeChipsWrap: {
    height: 48,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  activeChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal[50],
    borderWidth: 1,
    borderColor: colors.teal[200],
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeChipText: { fontSize: 12, fontWeight: "600", color: colors.teal[700] },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  list: { padding: 16, gap: 10 },
  hero: {
    backgroundColor: colors.teal[700],
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    gap: 4,
  },
  heroHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { flex: 1, gap: 3 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(204,251,241,0.7)",
    letterSpacing: 1.4,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 12, color: "rgba(204,251,241,0.75)" },
  heroStats: {
    flexDirection: "row",
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    overflow: "hidden",
  },
  heroStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  heroStatLabel: {
    fontSize: 10,
    color: "rgba(204,251,241,0.8)",
    fontWeight: "600",
  },
  heroStatValue: { fontSize: 14, fontWeight: "800", marginTop: 3 },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  heroFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#99F6E4" },
  heroStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(204,251,241,0.8)",
  },
  heroTotal: { fontSize: 11, color: "rgba(204,251,241,0.6)" },
  txnCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  txnMain: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txnEmoji: { fontSize: 17 },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  txnSub: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  txnRight: { alignItems: "flex-end", gap: 4 },
  txnAmount: { fontSize: 14, fontWeight: "800" },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  txnExpanded: {
    borderTopWidth: 1,
    borderTopColor: colors.teal[50],
    backgroundColor: colors.gray[50],
    padding: 14,
    gap: 8,
  },
  expandedNote: { fontSize: 12, color: colors.gray[500] },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
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
  emptyText: { fontSize: 15, color: colors.gray[400], fontWeight: "600" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});

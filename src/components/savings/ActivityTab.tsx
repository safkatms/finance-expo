import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api-error";
import { EntryRow } from "./EntryRow";
import { fmt } from "./format";
import type { SavingsEntry } from "@/types/finance";

type Filter = "all" | "deposit" | "withdraw";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdraw", label: "Withdrawals" },
];

/** Full history for the year: filter by type, grouped by month (newest first), delete with confirmation. */
export function ActivityTab({
  year,
  entries,
  isLoading,
  isError,
  error,
  onRetry,
  onDelete,
  onAddEntry,
}: {
  year: number;
  entries: SavingsEntry[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onDelete: (e: SavingsEntry) => void;
  onAddEntry: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const groups = useMemo(() => {
    const visible = filter === "all" ? entries : entries.filter((e) => e.type === filter);
    const map = new Map<string, SavingsEntry[]>();
    for (const e of visible) {
      if (!map.has(e.month)) map.set(e.month, []);
      map.get(e.month)!.push(e);
    }
    return [...map.entries()].map(([month, items]) => ({
      month,
      items,
      net: items.reduce((t, e) => t + (e.type === "deposit" ? e.amount : -e.amount), 0),
    }));
  }, [entries, filter]);

  if (isLoading) {
    return <View style={s.center}><Spinner /></View>;
  }
  if (isError) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{getApiErrorMessage(error, "Failed to load activity")}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={onRetry}>
          <Text style={s.primaryBtnLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={s.chipRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipSelected]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.chipLabel, filter === f.key && s.chipLabelSelected]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {groups.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>
            {entries.length === 0 ? `No entries yet for ${year}` : "Nothing matches this filter"}
          </Text>
          {entries.length === 0 && (
            <TouchableOpacity style={s.primaryBtn} onPress={onAddEntry}>
              <Text style={s.primaryBtnLabel}>Add entry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.month} style={s.group}>
            <View style={s.groupHead}>
              <Text style={s.groupTitle}>{g.month}</Text>
              <Text style={[s.groupNet, { color: g.net < 0 ? colors.red[500] : colors.gray[500] }]}>
                Net {g.net < 0 ? "−" : ""}
                {fmt(Math.abs(g.net))}
              </Text>
            </View>
            <View style={s.card}>
              {g.items.map((e, i) => (
                <View key={e.id} style={i > 0 && s.rowDivider}>
                  <EntryRow entry={e} onDelete={onDelete} />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", gap: 12, paddingVertical: 40 },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  emptyText: { fontSize: 14, color: colors.gray[500], fontWeight: "600" },
  primaryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: colors.teal[500], backgroundColor: colors.teal[50] },
  chipLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[700] },

  group: { gap: 6 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  groupNet: { fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.gray[50] },
});

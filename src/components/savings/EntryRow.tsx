import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { displayDate, fmt } from "./format";
import type { SavingsEntry } from "@/types/finance";

/** Compact deposit / withdrawal row. Pass onDelete to show the trash action. */
export function EntryRow({
  entry,
  onDelete,
}: {
  entry: SavingsEntry;
  onDelete?: (e: SavingsEntry) => void;
}) {
  const isDeposit = entry.type === "deposit";
  const tone = isDeposit ? colors.green[600] : colors.red[500];

  return (
    <View style={s.row}>
      <View style={[s.icon, { backgroundColor: isDeposit ? colors.green[50] : colors.red[50] }]}>
        <Feather name={isDeposit ? "arrow-down" : "arrow-up"} size={14} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {entry.account?.name ?? "Account"}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {displayDate(entry.entryDate)}
          {entry.note ? ` · ${entry.note}` : ""}
        </Text>
      </View>
      <Text style={[s.amount, { color: tone }]}>
        {isDeposit ? "+" : "−"}
        {fmt(entry.amount)}
      </Text>
      {onDelete && (
        <TouchableOpacity onPress={() => onDelete(entry)} hitSlop={10} style={s.del}>
          <Feather name="trash-2" size={14} color={colors.gray[400]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontWeight: "700", color: colors.gray[900] },
  sub: { fontSize: 11, color: colors.gray[400] },
  amount: { fontSize: 13, fontWeight: "800" },
  del: { padding: 4 },
});

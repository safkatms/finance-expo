import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { colors } from "./theme";
import Feather from "@expo/vector-icons/Feather";
interface Props {
  label?: string;
  weekKeys: string[];
  value: string;
  onChange: (val: string) => void;
}

export function WeekPicker({
  label = "Target Week",
  weekKeys,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const options = [
    { key: "", display: "Current Week (Default)" },
    ...weekKeys.map((k) => ({ key: k, display: k })),
  ];
  const current =
    options.find((o) => o.key === value)?.display ?? "Current Week (Default)";

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{current}</Text>
        <Feather name="chevron-down" size={16} color={colors.gray[400]} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.key === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onChange(item.key);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.key === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.display}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerText: { fontSize: 14, color: colors.gray[900], flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  optionSelected: { backgroundColor: colors.indigo[50] },
  optionText: { fontSize: 14, color: colors.gray[900] },
  optionTextSelected: { color: colors.indigo[600], fontWeight: "700" },
});

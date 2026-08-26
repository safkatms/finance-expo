import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ImageBackground,
  TextInput,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";
import { useWeeks } from "@/hooks/use-weeks";
import { Alert } from "@/components/ui/Alert";
import { WeekPicker } from "@/components/ui/WeekPicker";
import { colors } from "@/components/ui/theme";
import { enqueue } from "@/lib/offline-queue";
import NetInfo from "@react-native-community/netinfo";
import Feather from "@expo/vector-icons/Feather";

type Tab = "sale" | "payment" | "return";

const TAB_CONFIG: {
  id: Tab;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}[] = [
  {
    id: "sale",
    label: "Sale",
    color: colors.indigo[600],
    icon: "shopping-cart",
  },
  {
    id: "payment",
    label: "Payment",
    color: colors.green[600],
    icon: "credit-card",
  },
  {
    id: "return",
    label: "Return",
    color: colors.orange[500],
    icon: "rotate-ccw",
  },
];

type HeroConfig = {
  eyebrow: string;
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

const HERO: Record<Tab, HeroConfig> = {
  sale: {
    eyebrow: "Sales Intake",
    label: "New Order Sale",
    sub: "Recorded against the current open week",
    icon: "shopping-cart",
  },
  payment: {
    eyebrow: "Sales Intake",
    label: "Payment Remittance",
    sub: "Apply a collected payment to a week's balance",
    icon: "credit-card",
  },
  return: {
    eyebrow: "Sales Intake",
    label: "Return Adjustment",
    sub: "Correct the return value for a specific week",
    icon: "rotate-ccw",
  },
};

const HINT: Record<Tab, string> = {
  sale: "This sale will be recorded in the current open week",
  payment: "Payment will be applied to the selected week's balance",
  return: "Return amount will adjust the selected week's total",
};

const BTN_LABEL: Record<Tab, string> = {
  sale: "Add Sale",
  payment: "Record Payment",
  return: "Apply Correction",
};

export default function AddSalesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("sale");
  const [amount, setAmount] = useState("");
  const [weekKey, setWeekKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { data: weekKeys = [] } = useWeeks();
  const lastWeekKey = weekKeys[1] ?? weekKeys[0] ?? "";
  const activeColor =
    tab === "sale"
      ? colors.indigo[600]
      : tab === "payment"
        ? colors.green[600]
        : colors.orange[500];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    setErrorMsg("");
  };

  const addSale = useMutation({
    mutationFn: (amt: number) => api.post("/sales/sale", { amount: amt }),
    onSuccess: () => {
      invalidate();
      setSuccessMsg("✓ Sale recorded successfully!");
      setAmount("");
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  const addPayment = useMutation({
    mutationFn: (d: { amount: number; weekKey?: string }) =>
      api.post("/sales/payment", d),
    onSuccess: () => {
      invalidate();
      setSuccessMsg("✓ Remittance successfully applied!");
      setAmount("");
      setWeekKey("");
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  const addReturn = useMutation({
    mutationFn: (d: { amount: number; weekKey?: string }) =>
      api.post("/sales/return", d),
    onSuccess: () => {
      invalidate();
      setSuccessMsg("✓ Returns verified and calculated!");
      setAmount("");
      setWeekKey("");
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  const evalAmount = (expr: string): number => {
    const parts = expr
      .split("+")
      .map((p) => parseFloat(p.trim()))
      .filter((n) => !isNaN(n));
    return parts.reduce((a, b) => a + b, 0);
  };

  const handleSubmit = async () => {
    const amt = evalAmount(amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Enter a valid amount");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    const state = await NetInfo.fetch();
    const wk = weekKey || lastWeekKey;
    if (!state.isConnected) {
      await enqueue({ type: tab, amount: amt, weekKey: wk });
      setSuccessMsg("✓ Saved offline — will sync when connected.");
      setAmount("");
      setWeekKey("");
      return;
    }
    if (tab === "sale") addSale.mutate(amt);
    else if (tab === "payment") addPayment.mutate({ amount: amt, weekKey: wk });
    else addReturn.mutate({ amount: amt, weekKey: wk });
  };

  const isPending =
    addSale.isPending || addPayment.isPending || addReturn.isPending;
  const hero = HERO[tab];

  const switchTab = (id: Tab) => {
    setTab(id);
    setAmount("");
    setWeekKey("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const amountLabel =
    tab === "payment"
      ? "Amount Received (BDT)"
      : tab === "return"
        ? "Adjustment Value (BDT)"
        : "Amount (BDT)";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Entry</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <ImageBackground
            source={require("../../../../assets/sales-hero.png")}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroContent}>
              {/* Left: icon badge + text */}
              <View style={styles.heroLeft}>
                <View style={styles.heroIconBadge}>
                  <Feather name={hero.icon} size={22} color="#fff" />
                </View>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroEyebrow}>{hero.eyebrow}</Text>
                  <Text style={styles.heroTitle}>{hero.label}</Text>
                  <Text style={styles.heroSub}>{hero.sub}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* Tabs */}
          <View style={styles.tabBar}>
            {TAB_CONFIG.map(({ id, label, color, icon }) => {
              const active = tab === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.tabItem,
                    active && {
                      borderBottomColor: color,
                      borderBottomWidth: 2.5,
                    },
                  ]}
                  onPress={() => switchTab(id)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={icon}
                    size={15}
                    color={active ? color : colors.gray[400]}
                    style={{ marginBottom: 2 }}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      active ? { color } : styles.tabLabelInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alerts */}
          {errorMsg ? <Alert message={errorMsg} type="error" /> : null}
          {successMsg ? <Alert message={successMsg} type="success" /> : null}

          {/* Form card */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>{amountLabel}</Text>

            {/* Amount input with ৳ prefix */}
            <View style={styles.amountInputRow}>
              <View style={styles.amountPrefix}>
                <Text style={[styles.amountPrefixText, { color: activeColor }]}>
                  ৳
                </Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.gray[400]}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              {tab === "sale" && (
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => setAmount((prev) => prev + "+")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.plusBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
            {tab === "sale" &&
              amount.includes("+") &&
              evalAmount(amount) > 0 && (
                <Text style={styles.exprTotal}>
                  = ৳ {evalAmount(amount).toLocaleString("en-BD")}
                </Text>
              )}
            {/* Week picker (payment / return only) */}
            {(tab === "payment" || tab === "return") && (
              <WeekPicker
                label="Target Week"
                weekKeys={weekKeys}
                value={weekKey || lastWeekKey}
                onChange={setWeekKey}
              />
            )}

            {/* Info hint */}
            <View style={styles.hintBox}>
              <Feather name="info" size={14} color={colors.gray[400]} />
              <Text style={styles.hintText}>{HINT[tab]}</Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: activeColor }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isPending}
            >
              <Text style={styles.submitBtnLabel}>{BTN_LABEL[tab]}</Text>
              <View style={styles.submitArrow}>
                <Feather name="arrow-right" size={18} color={activeColor} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },

  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  // Hero
  hero: {
    borderRadius: 20,
    minHeight: 160,
    padding: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  heroImage: { borderRadius: 20 },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    flex: 1,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { flex: 1, gap: 4 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff", lineHeight: 26 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 17 },

  // Sparkles
  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  tabLabelInactive: { color: colors.gray[400] },

  // Form card
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
  },

  // Amount input
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.indigo[200],
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FAFAFE",
  },
  amountPrefix: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.indigo[100],
  },
  amountPrefixText: { fontSize: 18, fontWeight: "700" },
  amountInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.gray[900],
  },

  // Info hint
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.gray[50],
  },
  hintText: { fontSize: 13, color: colors.gray[400], flex: 1 },

  // Submit button
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 20,
  },
  submitBtnLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  submitArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  exprTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.indigo[600],
    textAlign: "right",
    marginTop: -8,
  },
  plusBtn: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.indigo[100],
    backgroundColor: "#FAFAFE",
  },
  plusBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.indigo[600],
  },
});

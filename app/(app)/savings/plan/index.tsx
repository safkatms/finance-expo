import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert as RNAlert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import {
  createSavingsPlan,
  deleteSavingsPlan,
  getSavingsPlans,
  renewSavingsPlan,
  updateSavingsPlan,
} from "@/lib/api/savings.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import type { SavingsPlan } from "@/types/finance";

const TARGET_KINDS = [
  { key: "none", label: "None" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "both", label: "Both" },
] as const;
type TargetKind = (typeof TARGET_KINDS)[number]["key"];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const positive = (v?: string) => !!v && !isNaN(parseFloat(v)) && parseFloat(v) > 0;

const schema = z
  .object({
    mode: z.enum(["auto", "manual"]),
    targetKind: z.enum(["none", "monthly", "yearly", "both"]),
    monthlyTarget: z.string().optional(),
    yearlyTarget: z.string().optional(),
    weeklyTarget: z.string().optional(),
    perMonth: z.boolean(),
    notes: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.weeklyTarget && !positive(d.weeklyTarget)) {
      ctx.addIssue({ code: "custom", path: ["weeklyTarget"], message: "Enter a valid weekly target" });
    }
    if (!d.perMonth && (d.targetKind === "monthly" || d.targetKind === "both") && !positive(d.monthlyTarget)) {
      ctx.addIssue({ code: "custom", path: ["monthlyTarget"], message: "Enter a monthly target" });
    }
    if ((d.targetKind === "yearly" || d.targetKind === "both") && !positive(d.yearlyTarget)) {
      ctx.addIssue({ code: "custom", path: ["yearlyTarget"], message: "Enter a yearly target" });
    }
  });

type FormData = z.infer<typeof schema>;

function kindOf(plan: SavingsPlan): TargetKind {
  const m = plan.monthlyTarget !== null;
  const y = plan.yearlyTarget !== null;
  return m && y ? "both" : m ? "monthly" : y ? "yearly" : "none";
}

export default function SavingsPlanFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; year?: string; renew?: string }>();

  const isEdit = !!params.id;
  const isRenew = params.renew === "1";
  const editId = params.id ? Number(params.id) : null;
  const [year, setYear] = useState(params.year ? Number(params.year) : new Date().getFullYear());

  // Plans list is used to prefill edit (by id) and renewal (latest earlier plan)
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["savings", "plans"],
    queryFn: getSavingsPlans,
    enabled: isEdit || isRenew,
  });
  const source = isEdit
    ? plans?.find((p) => p.id === editId)
    : isRenew
      ? plans?.filter((p) => p.year < year).sort((a, b) => b.year - a.year)[0]
      : undefined;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: "auto", targetKind: "none", monthlyTarget: "", yearlyTarget: "",
      weeklyTarget: "", perMonth: false, notes: "",
    },
  });

  // Per-month amounts (month 1-12 -> amount text) and week start day
  const [monthAmounts, setMonthAmounts] = useState<Record<number, string>>({});
  const [weekStartsOn, setWeekStartsOn] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (source) {
      reset({
        mode: source.mode,
        targetKind: kindOf(source),
        monthlyTarget: source.monthlyTarget !== null ? String(source.monthlyTarget) : "",
        yearlyTarget: source.yearlyTarget !== null ? String(source.yearlyTarget) : "",
        weeklyTarget: source.weeklyTarget !== null ? String(source.weeklyTarget) : "",
        perMonth: source.monthTargets.length > 0,
        notes: isEdit ? source.notes ?? "" : "",
      });
      setMonthAmounts(
        Object.fromEntries(source.monthTargets.map((t) => [t.month, String(t.target)])),
      );
      setWeekStartsOn(source.weekStartsOn);
    }
  }, [source?.id]);

  const mode = watch("mode");
  const targetKind = watch("targetKind");
  const perMonth = watch("perMonth");
  const selectedMonths = Object.keys(monthAmounts).map(Number).sort((a, b) => a - b);
  const showMonthly = !perMonth && (targetKind === "monthly" || targetKind === "both");
  const showYearly = targetKind === "yearly" || targetKind === "both";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["savings"] });
    qc.invalidateQueries({ queryKey: ["savings-entries"] });
  };

  const saveMut = useMutation({
    mutationFn: (d: FormData) => {
      const monthly = !d.perMonth && (d.targetKind === "monthly" || d.targetKind === "both")
        ? parseFloat(d.monthlyTarget!)
        : null;
      const weekly = d.weeklyTarget ? parseFloat(d.weeklyTarget) : null;
      const monthTargets = d.perMonth
        ? selectedMonths.map((m) => ({ month: m, target: parseFloat(monthAmounts[m]) }))
        : [];
      const yearly = d.targetKind === "yearly" || d.targetKind === "both" ? parseFloat(d.yearlyTarget!) : null;

      if (isEdit && editId) {
        return updateSavingsPlan(editId, {
          mode: d.mode,
          monthlyTarget: monthly,
          yearlyTarget: yearly,
          weeklyTarget: weekly,
          weekStartsOn,
          monthTargets,
          notes: d.notes ? d.notes : null,
        });
      }
      if (isRenew) {
        // Send explicit targets; keepTargets=false so cleared targets stay cleared
        return renewSavingsPlan({
          year, keepTargets: false, mode: d.mode, monthlyTarget: monthly, yearlyTarget: yearly,
          weeklyTarget: weekly, weekStartsOn, monthTargets,
        });
      }
      return createSavingsPlan({
        year,
        mode: d.mode,
        monthlyTarget: monthly ?? undefined,
        yearlyTarget: yearly ?? undefined,
        weeklyTarget: weekly ?? undefined,
        weekStartsOn,
        ...(monthTargets.length > 0 && { monthTargets }),
        notes: d.notes || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      router.back();
    },
  });

  const submit = handleSubmit((d) => {
    if (d.perMonth) {
      if (selectedMonths.length === 0) return setLocalError("Pick at least one month");
      if (selectedMonths.some((m) => !positive(monthAmounts[m]))) {
        return setLocalError("Enter a target amount for every selected month");
      }
    }
    setLocalError(null);
    saveMut.mutate(d);
  });

  const toggleMonth = (m: number) =>
    setMonthAmounts((prev) => {
      const next = { ...prev };
      if (m in next) delete next[m];
      else next[m] = "";
      return next;
    });

  // Select the current month through December (e.g. someone starting in November)
  const selectFromNow = () => {
    const first = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 1;
    setMonthAmounts((prev) => {
      const next = { ...prev };
      for (let m = first; m <= 12; m++) if (!(m in next)) next[m] = "";
      return next;
    });
  };

  const applyFirstToAll = () => {
    const first = monthAmounts[selectedMonths[0]];
    if (!positive(first)) return;
    setMonthAmounts(Object.fromEntries(selectedMonths.map((m) => [m, first])));
  };

  const deleteMut = useMutation({
    mutationFn: () => deleteSavingsPlan(editId!),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (err) => RNAlert.alert("Error", getApiErrorMessage(err, "Failed to delete plan")),
  });

  const confirmDelete = () => {
    RNAlert.alert(
      "Delete plan",
      `Delete the ${year} savings plan? Its manual entries will be deleted too. Transactions and account balances are not affected.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMut.mutate() },
      ],
    );
  };

  const title = isEdit ? `Edit ${year} plan` : isRenew ? `Renew for ${year}` : "New savings plan";

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={title}
        variant="teal"
        backIcon="x"
        rightTextAction={{
          label: saveMut.isPending ? "Saving…" : "Save",
          onPress: submit,
          disabled: isSubmitting || saveMut.isPending,
        }}
      />

      {(isEdit || isRenew) && plansLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {saveMut.isError && (
            <Alert message={getApiErrorMessage(saveMut.error, "Failed to save")} type="error" />
          )}

          {localError && <Alert message={localError} type="error" />}

          {/* Year */}
          <View style={s.field}>
            <Text style={s.label}>Year</Text>
            {isEdit || isRenew ? (
              <View style={[s.inputRow, s.yearStatic]}>
                <Text style={s.yearText}>{year}</Text>
                {isRenew && source && <Text style={s.hint}>  · based on {source.year}</Text>}
              </View>
            ) : (
              <View style={[s.inputRow, s.yearStepper]}>
                <TouchableOpacity onPress={() => setYear(year - 1)} hitSlop={8} style={s.stepBtn}>
                  <Feather name="chevron-left" size={18} color={colors.teal[700]} />
                </TouchableOpacity>
                <Text style={s.yearText}>{year}</Text>
                <TouchableOpacity onPress={() => setYear(year + 1)} hitSlop={8} style={s.stepBtn}>
                  <Feather name="chevron-right" size={18} color={colors.teal[700]} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Mode */}
          <View style={s.field}>
            <Text style={s.label}>Mode *</Text>
            <Controller
              control={control}
              name="mode"
              render={({ field: { onChange, value } }) => (
                <View style={s.modeCol}>
                  {([
                    { key: "auto", icon: "zap", title: "Auto", sub: "Income − expenses, updated as you add transactions" },
                    { key: "manual", icon: "edit-3", title: "Manual", sub: "Add or withdraw savings yourself, per account" },
                  ] as const).map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[s.modeCard, value === m.key && s.modeCardSelected]}
                      onPress={() => onChange(m.key)}
                      activeOpacity={0.8}
                    >
                      <Feather name={m.icon} size={18} color={value === m.key ? colors.teal[600] : colors.gray[400]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.modeTitle, value === m.key && { color: colors.teal[700] }]}>{m.title}</Text>
                        <Text style={s.modeSub}>{m.sub}</Text>
                      </View>
                      {value === m.key && <Feather name="check-circle" size={18} color={colors.teal[600]} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {isEdit && source && source.mode !== mode && (
              <Text style={s.hint}>
                {mode === "auto"
                  ? "Manual entries are kept but ignored while the plan is on Auto."
                  : "The whole year will be calculated from your manual entries."}
              </Text>
            )}
          </View>

          {/* Target kind */}
          <View style={s.field}>
            <Text style={s.label}>Savings target</Text>
            <Controller
              control={control}
              name="targetKind"
              render={({ field: { onChange, value } }) => (
                <View style={s.chipRow}>
                  {TARGET_KINDS.map((k) => (
                    <TouchableOpacity
                      key={k.key}
                      style={[s.chip, value === k.key && s.chipSelected]}
                      onPress={() => onChange(k.key)}
                    >
                      <Text style={[s.chipLabel, value === k.key && s.chipLabelSelected]}>{k.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {showMonthly && (
            <AmountField
              label="Monthly target *"
              control={control}
              name="monthlyTarget"
              error={errors.monthlyTarget?.message}
            />
          )}
          {showYearly && (
            <AmountField
              label="Yearly target *"
              control={control}
              name="yearlyTarget"
              error={errors.yearlyTarget?.message}
              onFillSuggestion={
                targetKind === "both" && positive(watch("monthlyTarget")) && !watch("yearlyTarget")
                  ? () => setValue("yearlyTarget", String(parseFloat(watch("monthlyTarget")!) * 12))
                  : undefined
              }
            />
          )}

          {/* Specific months */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Target specific months</Text>
              <Controller
                control={control}
                name="perMonth"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity
                    style={[s.chip, value && s.chipSelected]}
                    onPress={() => onChange(!value)}
                  >
                    <Text style={[s.chipLabel, value && s.chipLabelSelected]}>{value ? "On" : "Off"}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <Text style={s.hint}>
              {perMonth
                ? "Only the months you pick are tracked, each with its own amount."
                : "Off: the plan covers the whole year (Jan-Dec)."}
            </Text>
          </View>

          {perMonth && (
            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Months</Text>
                <TouchableOpacity onPress={selectFromNow} hitSlop={8}>
                  <Text style={s.suggest}>Current month → Dec</Text>
                </TouchableOpacity>
              </View>
              <View style={s.chipRow}>
                {MONTH_LABELS.map((label, i) => {
                  const on = i + 1 in monthAmounts;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[s.chip, on && s.chipSelected]}
                      onPress={() => toggleMonth(i + 1)}
                    >
                      <Text style={[s.chipLabel, on && s.chipLabelSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedMonths.length > 1 && (
                <TouchableOpacity onPress={applyFirstToAll} hitSlop={8}>
                  <Text style={s.suggest}>Use the first amount for all months</Text>
                </TouchableOpacity>
              )}

              {selectedMonths.map((m) => (
                <View key={m} style={s.inputRow}>
                  <View style={[s.inputPrefix, { width: 60 }]}>
                    <Text style={s.chipLabel}>{MONTH_LABELS[m - 1]}</Text>
                  </View>
                  <TextInput
                    style={s.textInput}
                    placeholder="Target amount"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                    value={monthAmounts[m]}
                    onChangeText={(v) => setMonthAmounts((prev) => ({ ...prev, [m]: v }))}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Weekly target */}
          <AmountField
            label="Weekly target (optional)"
            control={control}
            name="weeklyTarget"
            error={errors.weeklyTarget?.message}
          />
          <View style={s.field}>
            <Text style={s.label}>Week starts on</Text>
            <View style={s.chipRow}>
              {WEEK_DAYS.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, weekStartsOn === i && s.chipSelected]}
                  onPress={() => setWeekStartsOn(i)}
                >
                  <Text style={[s.chipLabel, weekStartsOn === i && s.chipLabelSelected]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          {!isRenew && (
            <View style={s.field}>
              <Text style={s.label}>Notes</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[s.inputRow, s.textareaRow]}>
                    <TextInput
                      style={[s.textInput, s.textarea]}
                      placeholder="Optional note…"
                      placeholderTextColor={colors.gray[400]}
                      multiline
                      numberOfLines={3}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} disabled={deleteMut.isPending}>
              <Feather name="trash-2" size={15} color={colors.red[500]} />
              <Text style={s.deleteLabel}>{deleteMut.isPending ? "Deleting…" : "Delete plan"}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function AmountField({
  label,
  control,
  name,
  error,
  onFillSuggestion,
}: {
  label: string;
  control: any;
  name: "monthlyTarget" | "yearlyTarget" | "weeklyTarget";
  error?: string;
  onFillSuggestion?: () => void;
}) {
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {onFillSuggestion && (
          <TouchableOpacity onPress={onFillSuggestion} hitSlop={8}>
            <Text style={s.suggest}>Use 12 × monthly</Text>
          </TouchableOpacity>
        )}
      </View>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={[s.inputRow, error && s.inputRowError]}>
            <View style={s.inputPrefix}>
              <Text style={s.currencySymbol}>৳</Text>
            </View>
            <TextInput
              style={s.textInput}
              placeholder="0"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          </View>
        )}
      />
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 20 },

  field: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  hint: { fontSize: 12, color: colors.gray[500], marginLeft: 2 },
  suggest: { fontSize: 12, fontWeight: "700", color: colors.teal[600] },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 14,
    overflow: "hidden",
  },
  inputRowError: { borderColor: colors.red[400] },
  inputPrefix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.teal[50],
  },
  textInput: { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, color: colors.gray[900] },
  textareaRow: { alignItems: "flex-start" },
  textarea: { height: 88, paddingTop: 14, textAlignVertical: "top" },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: colors.teal[500] },
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },

  yearStatic: { height: 50, paddingHorizontal: 14 },
  yearStepper: { height: 50, justifyContent: "space-between", paddingHorizontal: 8 },
  stepBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  yearText: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },

  modeCol: { gap: 8 },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  modeCardSelected: { borderColor: colors.teal[500], backgroundColor: colors.teal[50] },
  modeTitle: { fontSize: 14, fontWeight: "700", color: colors.gray[800] },
  modeSub: { fontSize: 12, color: colors.gray[500] },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: colors.teal[500], backgroundColor: colors.teal[50] },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[700] },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.red[100],
    backgroundColor: colors.red[50],
  },
  deleteLabel: { fontSize: 14, fontWeight: "700", color: colors.red[500] },
});

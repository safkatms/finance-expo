import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBudget, updateBudget } from "@/lib/api/budget.api";
import { getBudgetSummary } from "@/lib/api/budget.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import Feather from "@expo/vector-icons/Feather";
import { getCategories } from "@/lib/api/categories.api";
import type { Category } from "@/types/finance";

const MONTHS = [
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
  return `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

const schema = z.object({
  month: z
    .string()
    .min(1, "Month required")
    .regex(/^[A-Z][a-z]{2}-\d{4}$/, "Must be MMM-yyyy format"),
  categoryId: z.number().optional(),
  amount: z.string().min(1, "Amount required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function prevMonth(m: string) {
  const [mon, yr] = m.split("-");
  const d = new Date(`${mon} 1, ${yr}`);
  d.setMonth(d.getMonth() - 1);
  return `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function nextMonth(m: string) {
  const [mon, yr] = m.split("-");
  const d = new Date(`${mon} 1, ${yr}`);
  d.setMonth(d.getMonth() + 1);
  return `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(cat);
    if (cat.children?.length) result.push(...flattenCategories(cat.children));
  }
  return result;
}

export default function BudgetFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; month?: string }>();

  const isEdit = !!params.id;
  const editId = params.id ? Number(params.id) : null;

  // Load categories
  const { data: categoriesData, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const allCategories = flattenCategories(
    (categoriesData as Category[] | undefined) ?? [],
  ).filter((c) => c.applicableType === "Expense" || c.applicableType === null);

  // If editing, load the existing budget to prefill
  const editMonth = params.month ?? currentMonth();
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["budgets", editMonth],
    queryFn: () => getBudgetSummary(editMonth),
    enabled: isEdit,
  });
  const editItem = summaryData?.items.find((i) => i.id === editId);

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
      month: params.month ?? currentMonth(),
      categoryId: undefined,
      amount: "",
      notes: "",
    },
  });

  // Prefill when editing
  useEffect(() => {
    if (isEdit && editItem) {
      reset({
        month: editItem.month,
        categoryId: editItem.categoryId,
        amount: String(editItem.budgeted),
        notes: editItem.notes ?? "",
      });
    }
  }, [editItem, isEdit]);

  const month = watch("month");
  const selectedCategoryId = watch("categoryId");

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const amount = parseFloat(data.amount);
      if (isEdit && editId) {
        return updateBudget(editId, { amount, notes: data.notes || undefined });
      }
      return createBudget({
        month: data.month,
        categoryId: data.categoryId,
        amount,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      router.back();
    },
  });

  const isLoading = isEdit && (summaryLoading || catsLoading);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={isEdit ? "Edit Budget" : "New Budget"}
        variant="teal"
        rightTextAction={{
          label: saveMut.isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: isSubmitting || saveMut.isPending,
        }}
      />

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {saveMut.isError && (
            <Alert
              message={getApiErrorMessage(
                saveMut.error,
                "Failed to save budget",
              )}
              type="error"
            />
          )}

          {/* Month picker — hidden when editing */}
          {!isEdit && (
            <View style={s.field}>
              <Text style={s.label}>Month *</Text>
              <View style={s.monthNav}>
                <TouchableOpacity
                  onPress={() => setValue("month", prevMonth(month))}
                  style={s.monthNavBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="chevron-left"
                    size={20}
                    color={colors.teal[700]}
                  />
                </TouchableOpacity>
                <Text style={s.monthValue}>{month}</Text>
                <TouchableOpacity
                  onPress={() => setValue("month", nextMonth(month))}
                  style={s.monthNavBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={colors.teal[700]}
                  />
                </TouchableOpacity>
              </View>
              {errors.month && (
                <Text style={s.fieldError}>{errors.month.message}</Text>
              )}
            </View>
          )}

          {/* Budget type — hidden when editing */}
          {!isEdit && (
            <View style={s.field}>
              <Text style={s.label}>Budget Type *</Text>
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { onChange, value } }) => (
                  <View style={s.typeRow}>
                    <TouchableOpacity
                      style={[
                        s.typeBtn,
                        value === undefined && s.typeBtnActive,
                      ]}
                      onPress={() => onChange(undefined)}
                    >
                      <Feather
                        name="layers"
                        size={16}
                        color={value === undefined ? "#fff" : colors.gray[500]}
                      />
                      <Text
                        style={[
                          s.typeBtnLabel,
                          value === undefined && s.typeBtnLabelActive,
                        ]}
                      >
                        Overall
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.typeBtn,
                        value !== undefined && s.typeBtnActive,
                      ]}
                      onPress={() => {
                        if (allCategories.length > 0)
                          onChange(allCategories[0].id);
                      }}
                    >
                      <Feather
                        name="tag"
                        size={16}
                        color={value !== undefined ? "#fff" : colors.gray[500]}
                      />
                      <Text
                        style={[
                          s.typeBtnLabel,
                          value !== undefined && s.typeBtnLabelActive,
                        ]}
                      >
                        Per Category
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* Category selector — only when per-category mode and not editing */}
          {!isEdit && selectedCategoryId !== undefined && (
            <View style={s.field}>
              <Text style={s.label}>Category *</Text>
              {catsLoading ? (
                <Spinner />
              ) : (
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView
                      style={s.catScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={s.catGrid}>
                        {allCategories.map((cat) => {
                          const selected = value === cat.id;
                          const accent = cat.color ?? colors.teal[500];
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                s.catChip,
                                selected && {
                                  borderColor: accent,
                                  backgroundColor: accent + "15",
                                },
                              ]}
                              onPress={() => onChange(cat.id)}
                            >
                              {cat.icon && (
                                <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                              )}
                              <Text
                                style={[
                                  s.catChipLabel,
                                  selected && {
                                    color: accent,
                                    fontWeight: "700",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                />
              )}
            </View>
          )}

          {/* Amount */}
          <View style={s.field}>
            <Text style={s.label}>Budget Amount *</Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, errors.amount && s.inputRowError]}>
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
            {errors.amount && (
              <Text style={s.fieldError}>{errors.amount.message}</Text>
            )}
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Text style={s.label}>Notes</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, s.textareaRow]}>
                  <View style={s.inputPrefixTop}>
                    <Feather
                      name="align-left"
                      size={15}
                      color={colors.teal[500]}
                    />
                  </View>
                  <TextInput
                    style={[s.textInput, s.textarea]}
                    placeholder="Optional notes…"
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
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 20 },

  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 2,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  monthValue: { fontSize: 15, fontWeight: "700", color: colors.gray[800] },

  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  typeBtnActive: {
    borderColor: colors.teal[600],
    backgroundColor: colors.teal[600],
  },
  typeBtnLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[500] },
  typeBtnLabelActive: { color: "#fff" },

  catScroll: { maxHeight: 220 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  catChipLabel: { fontSize: 13, color: colors.gray[600], fontWeight: "600" },

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
  inputPrefixTop: {
    width: 44,
    paddingTop: 14,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  textareaRow: { alignItems: "flex-start" },
  textarea: { height: 88, paddingTop: 14, textAlignVertical: "top" },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: colors.teal[500] },
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },
});

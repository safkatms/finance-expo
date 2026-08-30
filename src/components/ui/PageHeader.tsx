import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { colors } from "@/components/ui/theme";

type HeaderVariant = "teal" | "white";
type BackIcon = "arrow-left" | "x";

export interface HeaderAction {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  badge?: number;
}

export interface HeaderTextAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  variant?: HeaderVariant;
  backIcon?: BackIcon;
  rightActions?: HeaderAction[];
  rightTextAction?: HeaderTextAction; // for Save/Done text buttons
  style?: ViewStyle;
}

const CONFIG: Record<
  HeaderVariant,
  {
    bg: string;
    borderColor?: string;
    titleColor: string;
    iconColor: string;
    iconBg: string;
  }
> = {
  teal: {
    bg: colors.teal[700],
    titleColor: "#fff",
    iconColor: "#fff",
    iconBg: "rgba(255,255,255,0.15)",
  },
  white: {
    bg: "#fff",
    borderColor: colors.gray[100],
    titleColor: colors.gray[900],
    iconColor: colors.gray[700],
    iconBg: "transparent",
  },
};

export function PageHeader({
  title,
  variant = "white",
  backIcon = "arrow-left",
  rightActions = [],
  rightTextAction,
  style,
}: PageHeaderProps) {
  const router = useRouter();
  const cfg = CONFIG[variant];

  return (
    <View
      style={[
        s.header,
        {
          backgroundColor: cfg.bg,
          borderBottomColor: cfg.borderColor ?? "transparent",
          borderBottomWidth: cfg.borderColor ? 1 : 0,
        },
        style,
      ]}
    >
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
        <View style={[s.iconBtn, { backgroundColor: cfg.iconBg }]}>
          <Feather name={backIcon} size={18} color={cfg.iconColor} />
        </View>
      </TouchableOpacity>

      {/* Title */}
      <Text style={[s.title, { color: cfg.titleColor }]}>{title}</Text>

      {/* Right side: text action takes priority, then icon actions */}
      {rightTextAction ? (
        <TouchableOpacity
          onPress={rightTextAction.onPress}
          hitSlop={8}
          disabled={rightTextAction.disabled}
        >
          <View
            style={[
              s.textActionBtn,
              variant === "teal" && s.textActionBtnTeal,
              rightTextAction.disabled && s.textActionBtnDisabled,
            ]}
          >
            <Text
              style={[
                s.textActionLabel,
                { color: variant === "teal" ? "#fff" : colors.teal[700] },
              ]}
            >
              {rightTextAction.label}
            </Text>
          </View>
        </TouchableOpacity>
      ) : rightActions.length > 0 ? (
        <View style={s.rightGroup}>
          {rightActions.slice(0, 2).map((action, i) => (
            <TouchableOpacity key={i} onPress={action.onPress} hitSlop={8}>
              <View style={[s.iconBtn, { backgroundColor: cfg.iconBg }]}>
                <Feather name={action.icon} size={18} color={cfg.iconColor} />
                {!!action.badge && action.badge > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{action.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.placeholder} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 17, fontWeight: "700" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rightGroup: { flexDirection: "row", gap: 8 },
  placeholder: { width: 32 },
  badge: {
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
  badgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  textActionBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  textActionBtnTeal: {
    // already set above, kept separate so white variant can override
  },
  textActionBtnDisabled: { opacity: 0.5 },
  textActionLabel: { fontSize: 14, fontWeight: "700" },
});

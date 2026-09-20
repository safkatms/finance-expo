// components/ui/OtpRevealModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";

interface Props {
  visible: boolean;
  password: string;
  userName: string;
  onClose: () => void;
}

export function OtpRevealModal({
  visible,
  password,
  userName,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setRevealed(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.handle} />

        {/* Icon */}
        <View style={s.iconWrap}>
          <Feather name="key" size={28} color={colors.teal[600]} />
        </View>

        <Text style={s.title}>Temporary Password</Text>
        <Text style={s.subtitle}>
          Share this one-time password with{" "}
          <Text style={s.nameHighlight}>{userName}</Text> securely. They will be
          prompted to change it on first login.
        </Text>

        {/* Password box */}
        <View style={s.passwordBox}>
          <Text style={s.passwordText} selectable>
            {revealed ? password : "•".repeat(password.length)}
          </Text>
          <TouchableOpacity
            style={s.revealBtn}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
          >
            <Feather
              name={revealed ? "eye-off" : "eye"}
              size={18}
              color={colors.teal[600]}
            />
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View style={s.warningBox}>
          <Feather name="alert-triangle" size={13} color={colors.amber[600]} />
          <Text style={s.warningText}>
            This password will not be shown again. Copy it before closing.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[s.copyBtn, copied && s.copyBtnDone]}
          onPress={handleCopy}
        >
          <Feather name={copied ? "check" : "copy"} size={16} color="#fff" />
          <Text style={s.copyBtnText}>
            {copied ? "Copied!" : "Copy password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
          <Text style={s.closeBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    marginBottom: 8,
  },

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.teal[50],
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 19,
  },
  nameHighlight: {
    fontWeight: "700",
    color: colors.gray[700],
  },

  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.gray[50],
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    gap: 12,
  },
  passwordText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray[900],
    letterSpacing: 2,
  },
  revealBtn: {
    padding: 4,
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "stretch",
    gap: 8,
    backgroundColor: colors.amber[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.amber[100],
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.amber[700],
    lineHeight: 17,
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  copyBtnDone: {
    backgroundColor: colors.teal[500],
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  closeBtn: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 12,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.gray[400],
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { colors, fonts } from "./theme";

export function Button({ title, loading, ...props }: PressableProps & { title: string; loading?: boolean }) {
  return (
    <Pressable {...props} disabled={loading || props.disabled} style={({ pressed }) => [
      styles.button, pressed && styles.pressed, (loading || props.disabled) && styles.disabled
    ]}>
      {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

export function Avatar({ name, size = 46, uri }: { name: string; size?: number; uri?: string | null }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
        : <Text style={[styles.avatarText, { fontSize: size * .38 }]}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

export function IconButton({ name, active, label, ...props }: PressableProps & {
  name: ComponentProps<typeof Ionicons>["name"]; active?: boolean; label: string;
}) {
  return (
    <Pressable accessibilityLabel={label} {...props} style={({ pressed }) => [
      styles.iconButton, active && styles.iconButtonActive, pressed && styles.iconButtonPressed
    ]}>
      <Ionicons name={name} size={20} color={active ? "white" : colors.muted} />
    </Pressable>
  );
}

export function StateView({ title, detail, loading, action }: {
  title: string; detail?: string; loading?: boolean; action?: React.ReactNode;
}) {
  return (
    <View style={styles.state}>
      {loading && <ActivityIndicator color={colors.primary} size="large" />}
      <Text style={styles.stateTitle}>{title}</Text>
      {!!detail && <Text style={styles.stateDetail}>{detail}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52, paddingHorizontal: 22, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", shadowColor: colors.shadow, shadowOpacity: .06,
    shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2
  },
  buttonText: { color: "white", fontFamily: fonts.bold, fontSize: 17, letterSpacing: .1 },
  pressed: { opacity: .88, transform: [{ scale: .99 }] },
  disabled: { opacity: .55 },
  avatar: {
    backgroundColor: "#E1F0E6", borderWidth: 0,
    alignItems: "center", justifyContent: "center"
  },
  avatarText: { color: colors.ink, fontFamily: fonts.bold },
  iconButton: {
    width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent"
  },
  iconButtonActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  iconButtonPressed: { transform: [{ scale: .94 }], opacity: .82 },
  state: { flex: 1, padding: 32, alignItems: "center", justifyContent: "center", gap: 10 },
  stateTitle: { color: colors.ink, fontSize: 23, fontFamily: fonts.bold, textAlign: "center" },
  stateDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, textAlign: "center", lineHeight: 23, maxWidth: 320 }
});

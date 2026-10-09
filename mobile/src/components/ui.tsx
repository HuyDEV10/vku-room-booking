import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export const colors = {
  ink: '#17352E',
  muted: '#63776F',
  primary: '#18664D',
  pale: '#EAF3ED',
  background: '#F6F8F4',
  line: '#DDE6DE',
  white: '#FFFFFF',
  danger: '#A73832',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 20,
    gap: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted },
  heading: { fontSize: 18, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 18,
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 13, color: colors.ink },
  error: { color: colors.danger, lineHeight: 21, fontSize: 14 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600' },
});
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && { backgroundColor: colors.pale },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {busy && (
        <ActivityIndicator color={secondary ? colors.primary : colors.white} />
      )}
      <Text style={[styles.buttonText, secondary && { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && { color: colors.white, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function Screen({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function showError(e: unknown): string {
  return e instanceof Error
    ? e.message
    : 'Thao tác chưa thành công. Hãy thử lại.';
}

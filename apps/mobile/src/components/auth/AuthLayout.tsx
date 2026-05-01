import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface AuthLayoutProps {
  kicker?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ kicker, title, description, children, footer }: AuthLayoutProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.brand,
              {
                backgroundColor: theme.colors.primary,
                ...theme.shadows.md,
                shadowColor: theme.colors.primaryDark,
              },
            ]}
          >
            <Text style={[styles.brandLetter, { color: theme.colors.onPrimary }]}>S</Text>
          </View>

          {kicker && (
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>{kicker}</Text>
          )}
          <Text
            style={[
              styles.title,
              { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily },
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
          )}

          <View style={styles.form}>{children}</View>

          {footer && <View style={styles.footer}>{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28 },
  brand: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  brandLetter: { fontSize: 30, fontWeight: '800' },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '700', marginTop: 8, lineHeight: 36 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  form: { marginTop: 24, gap: 16 },
  footer: { marginTop: 24 },
});

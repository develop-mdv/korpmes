import React, { forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, error, style, ...rest },
  ref,
) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
            color: theme.colors.textPrimary,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  input: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  error: { fontSize: 12, fontWeight: '500' },
});

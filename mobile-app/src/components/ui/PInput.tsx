import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { theme } from '../../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  required?: boolean;
}

export const PInput = ({
  label,
  error,
  hint,
  rightIcon,
  onRightIconPress,
  required = false,
  ...props
}: Props) => {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={[styles.inputWrapper, { borderColor }]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.gray300}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Text style={{ fontSize: 18 }}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  label: {
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
    color: theme.colors.gray700,
    marginBottom: 6,
  },
  required: { color: theme.colors.danger },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.size.md,
    color: theme.colors.black,
    paddingVertical: 14,
  },
  rightIcon: { padding: 4 },
  error: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.danger,
    marginTop: 4,
  },
  hint: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: 4,
  },
});

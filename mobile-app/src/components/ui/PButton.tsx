import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: ViewStyle;
}

const variantStyles: Record<
  Variant,
  { bg: string; border: string; text: string }
> = {
  primary: { bg: theme.colors.primary, border: 'transparent', text: '#fff' },
  secondary: { bg: theme.colors.secondary, border: 'transparent', text: '#fff' },
  outline: {
    bg: 'transparent',
    border: theme.colors.primary,
    text: theme.colors.primary,
  },
  ghost: {
    bg: theme.colors.primaryLight,
    border: 'transparent',
    text: theme.colors.primary,
  },
  danger: { bg: theme.colors.danger, border: 'transparent', text: '#fff' },
};

const sizeStyles: Record<
  Size,
  { py: number; px: number; fontSize: number; radius: number }
> = {
  sm: { py: 8, px: 16, fontSize: 13, radius: theme.radius.md },
  md: { py: 14, px: 24, fontSize: 15, radius: theme.radius.lg },
  lg: { py: 18, px: 32, fontSize: 17, radius: theme.radius.xl },
};

export const PButton = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: Props) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>
          {icon ? `${icon}  ` : ''}
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', letterSpacing: 0.2 },
});

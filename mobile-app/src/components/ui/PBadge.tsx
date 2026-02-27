import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

type Variant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'default'
  | 'primary';

const colors: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: theme.colors.primaryLight, text: theme.colors.primary },
  success: { bg: theme.colors.successLight, text: theme.colors.success },
  danger: { bg: theme.colors.dangerLight, text: theme.colors.danger },
  warning: { bg: theme.colors.warningLight, text: theme.colors.warning },
  info: { bg: '#EFF6FF', text: '#1D4ED8' },
  default: { bg: theme.colors.gray100, text: theme.colors.gray700 },
};

export const PBadge = ({
  label,
  variant = 'default',
  dot = false,
}: {
  label: string;
  variant?: Variant;
  dot?: boolean }) => (
  <View style={[styles.badge, { backgroundColor: colors[variant].bg }]}>
    {dot && (
      <View style={[styles.dot, { backgroundColor: colors[variant].text }]} />
    )}
    <Text style={[styles.text, { color: colors[variant].text }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});

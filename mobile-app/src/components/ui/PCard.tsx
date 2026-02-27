import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

export const PCard = ({
  children,
  style,
  padding = 'md',
  shadow = 'sm',
}: Props) => {
  const paddings = { sm: 12, md: 16, lg: 24 };
  return (
    <View
      style={[
        styles.card,
        shadow !== 'none' && theme.shadow[shadow],
        { padding: paddings[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

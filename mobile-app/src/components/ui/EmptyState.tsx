import { View, StyleSheet, Text } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  icon?: string;
}

export const EmptyState = ({
  title,
  subtitle,
  icon = '📭',
}: Props) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  subtitle: { textAlign: 'center', color: '#666', lineHeight: 20 },
});

import { View, StyleSheet, Text } from 'react-native';

interface Props {
  message: string;
}

export const ErrorMessage = ({ message }: Props) =>
  message ? (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  ) : null;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  text: { color: '#DC2626', fontSize: 13 },
});

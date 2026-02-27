import { View, ActivityIndicator, StyleSheet } from 'react-native';

export const LoadingScreen = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#E85D04" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

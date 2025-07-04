import WelcomeScreen from '@/components/WelcomeScreen';
import { StyleSheet, View } from 'react-native';

export const screenOptions = {
  headerShown: false,
};

export default function HomeScreen() {
  return (
    <View style={styles.fullScreenContainer}>
      <WelcomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

import { StyleSheet } from 'react-native';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
import CameraFunction from '@/components/Camera/CameraFunction';
import { View } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={styles.fullScreenContainer}>
    <CameraFunction />
  </View>
      
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

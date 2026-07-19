import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Theme } from "../constants/Theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeText = "Welcome to OptiCoder. Please take an initial photo of your project.";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Speech.speak(welcomeText, {
      language: "en-US",
      onDone: () => {
        router.push("/camera");  // Navigate to the camera screen after speech is done
      },
    });

    return () => {
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/animations/opticoderlogo.json")}
        autoPlay
        loop={false}
        style={styles.logo}
      />

      <Animated.Text style={[styles.text, { opacity: fadeAnim }]}>
        {welcomeText}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.lg,
  },
  logo: {
    // Tamaño fijo del logo de bienvenida (pieza de marca, no token)
    width: 260,
    height: 260,
    alignSelf: "center",
    marginBottom: Theme.spacing.xl,
  },
  text: {
    fontSize: Theme.typography.lg,
    color: Theme.colors.primary,
    textAlign: "center",
    fontWeight: Theme.typography.semiBold,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
});

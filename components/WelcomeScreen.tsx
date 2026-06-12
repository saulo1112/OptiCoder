import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeText = "Bienvenido a OptiCoder. Por favor toma una foto inicial de tu proyecto.";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Speech.speak(welcomeText, {
      language: "es-ES",
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: 30,
  },
  text: {
    fontSize: 22,
    color: "#0057A4", // OptiCoder blue
    textAlign: "center",
    fontWeight: "600",
  },
});

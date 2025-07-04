import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const welcomeText = "Bienvenido a OptiCoder. Por favor toma una foto inicial de tu proyecto.";

  useEffect(() => {
    // Animar texto
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Leer el texto en voz alta y luego navegar
    Speech.speak(welcomeText, {
      language: "es-ES",
      onDone: () => {
        router.push("/camera");
      },
    });

    return () => {
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
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
  text: {
    fontSize: 22,
    color: "blue",
    textAlign: "center",
    fontWeight: "600",
  },
});

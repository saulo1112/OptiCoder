import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function VoiceVisualizer({ isActive }: { isActive: boolean }) {
  return (
    <View style={styles.container}>
      {isActive && (
        <LottieView
          source={require("../assets/animations/ai-speaking.json")}
          autoPlay
          loop
          style={styles.animation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  animation: {
    width: 100,
    height: 100,
  },
});

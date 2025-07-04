import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ImageChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const handleMicPress = () => {
    setIsListening(false);
    setMessages((prev) => [...prev, "🎙️ Usuario: ... (aquí iría el texto capturado por voz)"]);
  };

  const handleRetakePhoto = () => {
    router.push("/camera");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.chatArea}>
        {messages.map((msg, index) => (
          <Text key={index} style={styles.message}>
            {msg}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
          <Ionicons name="mic-outline" size={36} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
          <Text style={styles.retakeText}>📸 Tomar otra foto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  chatArea: {
    padding: 16,
    justifyContent: "flex-end",
  },
  message: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 8,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1a1a1a",
  },
  micButton: {
    backgroundColor: "#6200ee",
    padding: 16,
    borderRadius: 50,
    elevation: 4,
  },
  retakeButton: {
    marginLeft: 16,
    backgroundColor: "#03dac6",
    padding: 12,
    borderRadius: 8,
  },
  retakeText: {
    color: "#000",
    fontWeight: "bold",
  },
});

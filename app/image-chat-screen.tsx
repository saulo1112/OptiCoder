import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeImageWithGemini } from "../services/GeminiService";
import { ImageStore } from "../services/ImageStore";
import { transcribeAudioWithWhisper } from "../services/transcribeAudioWithWhisper";

// Tipo para manejar el historial de chat correctamente tipado
type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export default function ImageChatScreen() {
  const router = useRouter();
  const { selectedLanguage = "es" } = useLocalSearchParams<{ selectedLanguage?: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const imageBase64 = ImageStore.getBase64() ?? "";

  const [messages, setMessages] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    const runInitialPrompt = async () => {
      try {
        const initialPrompt = `Actúa como un asistente experto en desarrollo móvil. Observa la imagen proporcionada y ofrece una descripción breve. Luego, formula una pregunta amable que motive al usuario a continuar la conversación.`;

        const response = await analyzeImageWithGemini(imageBase64, initialPrompt);
        const assistantMessage = `🤖 Asistente: ${response}\n¿Sobre qué parte de este proyecto deseas saber más? Toca el micrófono para responder.`;

        setMessages((prev) => [...prev, assistantMessage]);
        setChatHistory([{ role: "model", content: response }]);

        Speech.speak(response + ". ¿Sobre qué parte de este proyecto deseas saber más?", {
          language: voiceLang,
        });
      } catch (err) {
        console.error("Error al procesar la imagen:", err);
        const fallback = "No se pudo procesar la imagen. Intenta nuevamente.";
        setMessages((prev) => [...prev, "🤖 Asistente: " + fallback]);
        Speech.speak(fallback, { language: voiceLang });
      }
    };

    runInitialPrompt();
  }, []);

  const startRecording = async () => {
    try {
      if (isRecording) return;

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permiso requerido", "Se necesita acceso al micrófono.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Error al iniciar grabación:", err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        const userText = await transcribeAudioWithWhisper(uri);
        setMessages((prev) => [...prev, "🎙️ Usuario: " + userText]);

        // 🔹 Añadir turno del usuario al historial
        const newHistory: ChatTurn[] = [...chatHistory, { role: "user", content: userText }];

        const response = await analyzeImageWithGemini(imageBase64, userText);
        const assistantText = "🤖 Asistente: " + response;

        setMessages((prev) => [...prev, assistantText]);
        setChatHistory([...newHistory, { role: "model", content: response }]);

        Speech.speak(response, { language: voiceLang });
      }
    } catch (err) {
      console.error("Error al detener grabación:", err);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const handleMicPress = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const handleRetakePhoto = () => {
    Speech.stop();
    ImageStore.clear();
    router.push("/camera");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.chatArea}>
        {messages.map((msg, index) => (
          <Text key={index} style={styles.message}>{msg}</Text>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
          <Ionicons name={isRecording ? "stop" : "mic-outline"} size={36} color="white" />
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

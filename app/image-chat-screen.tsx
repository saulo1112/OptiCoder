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

import VoiceVisualizer from "../components/VoiceVisualizer";
import { analyzeImageWithGemini } from "../services/GeminiService";
import { ImageStore } from "../services/ImageStore";
import { transcribeAudioWithWhisper } from "../services/transcribeAudioWithWhisper";

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export default function ImageChatScreen() {
  const router = useRouter();
  const { selectedLanguage = "es" } = useLocalSearchParams<{ selectedLanguage?: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const imageBase64 = ImageStore.getBase64() ?? "";
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    const runInitialPrompt = async () => {
      try {
        const initialPrompt = `Actúa como un asistente experto en desarrollo móvil. Observa la imagen proporcionada y ofrece una descripción breve. Luego, formula una pregunta amable que motive al usuario a continuar la conversación.`;

        const response = await analyzeImageWithGemini(imageBase64, initialPrompt);
        const assistantText = `${response} ¿Sobre qué parte de este proyecto deseas saber más?`;

        setMessages([{ role: "model", content: assistantText }]);
        Speech.speak(assistantText, { language: voiceLang });
      } catch (err) {
        const fallback = "No se pudo procesar la imagen. Intenta nuevamente.";
        setMessages([{ role: "model", content: fallback }]);
        Speech.speak(fallback, { language: voiceLang });
      }
    };

    runInitialPrompt();
  }, []);

  const startRecording = async () => {
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
  };

  const stopRecording = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setIsRecording(false);
    setRecording(null);

    if (uri) {
      const userText = await transcribeAudioWithWhisper(uri);
      const userTurn: ChatTurn = { role: "user", content: userText };
      const response = await analyzeImageWithGemini(imageBase64, userText);
      const assistantTurn: ChatTurn = { role: "model", content: response };

      setMessages((prev) => [...prev, userTurn, assistantTurn]);
      Speech.speak(response, { language: voiceLang });
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
      <View style={styles.visualizerArea}>
        <VoiceVisualizer isActive={isRecording} />
      </View>

      <ScrollView style={styles.chatBox}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.userBubble : styles.modelBubble,
            ]}
          >
            <Text style={styles.bubbleText}>
              {msg.role === "user" ? "🎙️ " : "🤖 "}
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
          <Ionicons name={isRecording ? "stop" : "mic-outline"} size={36} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => Speech.stop()}>
          <Text style={styles.skipText}>⏭️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
          <Text style={styles.retakeText}>📸 Tomar otra foto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visualizerArea: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBox: {
    maxHeight: 200,
    width: "90%",
    marginBottom: 10,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    maxWidth: "90%",
  },
  userBubble: {
    backgroundColor: "#d0e8ff",
    alignSelf: "flex-end",
  },
  modelBubble: {
    backgroundColor: "#f1f1f1",
    alignSelf: "flex-start",
  },
  bubbleText: {
    fontSize: 16,
    color: "#000",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    padding: 16,
    backgroundColor: "#fff",
  },
  micButton: {
    backgroundColor: "#6200ee",
    padding: 16,
    borderRadius: 50,
    elevation: 4,
  },
  skipButton: {
    marginLeft: 8,
    backgroundColor: "#ffcc00",
    padding: 12,
    borderRadius: 8,
  },
  skipText: {
    color: "#000",
    fontWeight: "bold",
  },
  retakeButton: {
    marginLeft: 8,
    backgroundColor: "#03dac6",
    padding: 12,
    borderRadius: 8,
  },
  retakeText: {
    color: "#000",
    fontWeight: "bold",
  },
});

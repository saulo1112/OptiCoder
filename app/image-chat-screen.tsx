import Ionicons from "@expo/vector-icons/Ionicons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { TTSService } from "../services/TTSService";
import { transcribeAudioWithWhisper } from "../services/transcribeAudioWithWhisper";

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export default function ImageChatScreen() {
  const router = useRouter();
  const { selectedLanguage = "es" } =
    useLocalSearchParams<{ selectedLanguage?: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Bloquea acciones concurrentes (doble tap, grabar mientras se procesa, etc.)
  const [isProcessing, setIsProcessing] = useState(false);
  // Indica que la escucha se activó automáticamente al terminar el TTS
  const [isAutoListening, setIsAutoListening] = useState(false);

  // Refs espejo: los callbacks asíncronos (onDone del TTS) leen el valor
  // actual y no el del cierre en que se crearon.
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const setProcessing = (value: boolean) => {
    isProcessingRef.current = value;
    if (isMountedRef.current) setIsProcessing(value);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      TTSService.stop();
    };
  }, []);

  // === PROMPT INICIAL ===
  useEffect(() => {
    const runInitialPrompt = async () => {
      setProcessing(true);
      setIsLoading(true);
      try {
        const initialPrompt = `Actúa como un asistente experto en desarrollo móvil. Observa la imagen proporcionada y ofrece una descripción breve. Luego, formula una pregunta amable que motive al usuario a continuar la conversación.`;

        const response = await analyzeImageWithGemini(
          ImageStore.getImages(),
          initialPrompt
        );
        const assistantText = `${response} ¿Sobre qué parte de este proyecto deseas saber más?`;

        // Sólo guardamos el mensaje del modelo; el audio lo maneja el otro useEffect
        if (isMountedRef.current) {
          setMessages([{ role: "model", content: assistantText }]);
        }
      } catch (err) {
        console.error("Error en el prompt inicial:", err);
        const fallback = "No se pudo procesar la imagen. Intenta nuevamente.";
        if (isMountedRef.current) {
          setMessages([{ role: "model", content: fallback }]);
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
        setProcessing(false);
      }
    };

    runInitialPrompt();
  }, []);

  // === TTS: lee SIEMPRE el último mensaje del modelo y luego activa la escucha ===
  useEffect(() => {
    if (!messages.length) return;

    const last = messages[messages.length - 1];
    if (last.role !== "model" || !last.content?.trim()) return;

    setIsSpeaking(true);

    TTSService.speak(last.content, voiceLang, () => {
      if (!isMountedRef.current) return;
      setIsSpeaking(false);
      // Manos libres: al terminar de hablar el asistente, empieza a escuchar
      if (!isProcessingRef.current && !isRecordingRef.current) {
        startRecording(true);
      }
    });
    // startRecording se omite a propósito: lee refs, no estado del cierre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceLang]);

  // === Auto-scroll al final cada vez que cambian los mensajes ===
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // === Pulso animado del micrófono cuando la escucha es automática ===
  useEffect(() => {
    if (isAutoListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [isAutoListening, pulseAnim]);

  const startRecording = async (auto: boolean = false) => {
    if (isRecordingRef.current || isProcessingRef.current) return;

    setProcessing(true);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permiso requerido", "Se necesita acceso al micrófono.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      isRecordingRef.current = true;
      if (isMountedRef.current) {
        setIsRecording(true);
        setIsAutoListening(auto);
      }
    } catch (err) {
      console.error("Error al iniciar la grabación:", err);
      if (isMountedRef.current) {
        Alert.alert("Error", "No se pudo iniciar la grabación de voz.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;

    setProcessing(true);
    isRecordingRef.current = false;
    if (isMountedRef.current) {
      setIsRecording(false);
      setIsAutoListening(false);
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;

      if (isMountedRef.current) setIsLoading(true);

      const userText = await transcribeAudioWithWhisper(uri, selectedLanguage);
      const userTurn: ChatTurn = { role: "user", content: userText };

      const response = await analyzeImageWithGemini(
        ImageStore.getImages(),
        userText,
        messages
      );
      const assistantTurn: ChatTurn = { role: "model", content: response };

      // Sólo actualizamos mensajes; el useEffect de arriba se encargará de hablar
      if (isMountedRef.current) {
        setMessages((prev) => [...prev, userTurn, assistantTurn]);
      }
    } catch (err) {
      console.error("Error al procesar la grabación:", err);
      if (isMountedRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: "Ocurrió un error al procesar tu voz. Intenta nuevamente.",
          },
        ]);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      setProcessing(false);
    }
  };

  const handleMicPress = () => {
    if (isProcessingRef.current) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRepeatLast = () => {
    const lastModel = [...messages].reverse().find((m) => m.role === "model");
    if (!lastModel || isSpeaking || isProcessing) return;

    setIsSpeaking(true);
    TTSService.speak(lastModel.content, voiceLang, () => {
      if (isMountedRef.current) setIsSpeaking(false);
    });
  };

  const handleRetakePhoto = () => {
    TTSService.stop();
    setIsSpeaking(false);
    router.push("/camera");
  };

  const lastModelIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "model") return i;
    }
    return -1;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <LottieView
        source={require("../assets/animations/opticoderlogo.json")}
        autoPlay
        loop={false}
        style={styles.logo}
      />

      <View style={styles.animationArea}>
        {isLoading && (
          <LottieView
            source={require("../assets/animations/loading-screen.json")}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
        )}
        {!isLoading && isSpeaking && (
          <LottieView
            source={require("../assets/animations/robot-speaking.json")}
            autoPlay
            loop
            style={styles.robotAnimation}
          />
        )}
      </View>

      <View style={styles.visualizerArea}>
        <VoiceVisualizer isActive={isRecording} />
      </View>

      <ScrollView style={styles.chatBox} ref={scrollViewRef}>
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
            {index === lastModelIndex && (
              <TouchableOpacity
                style={styles.repeatButton}
                onPress={handleRepeatLast}
                disabled={isSpeaking || isProcessing}
                accessibilityLabel="Repetir última respuesta"
              >
                <Ionicons
                  name="repeat"
                  size={18}
                  color={isSpeaking || isProcessing ? "#aaa" : "#6200ee"}
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.micButton, isProcessing && styles.micButtonDisabled]}
            onPress={handleMicPress}
            disabled={isProcessing}
            accessibilityLabel={
              isRecording ? "Detener grabación" : "Iniciar grabación"
            }
          >
            <Ionicons
              name={isRecording ? "stop" : "mic-outline"}
              size={36}
              color="white"
            />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            TTSService.stop();
            setIsSpeaking(false);
          }}
        >
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
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  animationArea: {
    height: 100,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  loadingAnimation: {
    width: 80,
    height: 80,
    position: "absolute",
    top: -5, // ← mueve loading ↑ o ↓
  },
  robotAnimation: {
    width: 140,
    height: 180,
    position: "absolute",
    top: -50, // ← mueve robot ↑ o ↓
  },
  visualizerArea: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -150, // ← mueve ondas ↑ o ↓
  },
  chatBox: {
    maxHeight: "60%",
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
  micButtonDisabled: {
    opacity: 0.5,
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
  repeatButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    padding: 4,
  },
});

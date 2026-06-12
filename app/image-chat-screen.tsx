import Ionicons from "@expo/vector-icons/Ionicons";
import {
  AudioModule,
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
import { Theme } from "../constants/Theme";
import { analyzeImageWithGemini } from "../services/GeminiService";
import { ImageStore } from "../services/ImageStore";
import {
  VOICE_COMMAND_RECORDING_OPTIONS,
  waitForSpeechEnd,
} from "../services/recordingOptions";
import { TTSService } from "../services/TTSService";
import {
  TRANSCRIPTION_FAILED,
  transcribeAudioWithWhisper,
} from "../services/transcribeAudioWithWhisper";

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export default function ImageChatScreen() {
  const router = useRouter();
  const { selectedLanguage = "es" } =
    useLocalSearchParams<{ selectedLanguage?: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const recorder = useAudioRecorder(VOICE_COMMAND_RECORDING_OPTIONS);

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
        // Reutiliza la descripción generada durante la captura para evitar
        // una segunda llamada a Gemini antes de la primera respuesta hablada.
        const cachedDescription = ImageStore.consumePendingDescription();

        let response: string;
        if (cachedDescription && cachedDescription.trim()) {
          response = cachedDescription;
        } else {
          const initialPrompt = `Actúa como un asistente experto en desarrollo móvil. Observa la imagen proporcionada y ofrece una descripción breve. Luego, formula una pregunta amable que motive al usuario a continuar la conversación.`;

          response = await analyzeImageWithGemini(
            ImageStore.getImages(),
            initialPrompt
          );
        }
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
            toValue: 1.18,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
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

    // Parada automática: si la grabación arrancó, espera el fin del habla
    // (máx. 8 s o 800 ms de silencio) y detiene. Se hace fuera del try/finally
    // para que isProcessing vuelva a false y el usuario pueda detener con un
    // toque manual antes de que venza el temporizador.
    if (isRecordingRef.current) {
      await waitForSpeechEnd(recorder);
      // Sólo detenemos si el usuario no lo hizo ya manualmente.
      if (isRecordingRef.current) {
        stopRecording();
      }
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

      // Fallo de transcripción: no enviar el centinela a Gemini como si fuera
      // una pregunta real; avisar por voz y dejar que el usuario reintente.
      if (userText === TRANSCRIPTION_FAILED) {
        TTSService.speak(
          "No pude escucharte. Por favor, intenta de nuevo.",
          voiceLang,
          () => {
            if (isMountedRef.current && !isProcessingRef.current) startRecording(true);
          }
        );
        return;
      }

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

  const statusLabelText = isLoading
    ? "Analizando imagen..."
    : isSpeaking
    ? "OptiCoder está respondiendo"
    : isRecording
    ? "Escuchando..."
    : "";

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

      <View style={styles.statusLabelContainer}>
        <Text style={styles.statusLabel}>{statusLabelText}</Text>
      </View>

      <View style={styles.visualizerArea}>
        <VoiceVisualizer isActive={isRecording} />
      </View>

      <ScrollView style={styles.chatBox} ref={scrollViewRef}>
        {messages.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={40}
              color={Theme.colors.textDisabled}
            />
            <Text style={styles.emptyStateText}>
              La descripción de la imagen aparecerá aquí
            </Text>
          </View>
        )}
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              msg.role === "user" ? styles.userBubble : styles.modelBubble,
            ]}
          >
            <Text
              style={
                msg.role === "user"
                  ? styles.userBubbleText
                  : styles.modelBubbleText
              }
            >
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
                  color={
                    isSpeaking || isProcessing
                      ? Theme.colors.textDisabled
                      : Theme.colors.primary
                  }
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              isProcessing && styles.micButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isProcessing}
            accessibilityLabel={
              isRecording ? "Detener grabación" : "Iniciar grabación"
            }
          >
            <Ionicons
              name={isRecording ? "stop" : "mic-outline"}
              size={36}
              color={Theme.colors.textOnPrimary}
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
          <Ionicons
            name="play-skip-forward-outline"
            size={22}
            color={Theme.colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
          <Ionicons name="camera-outline" size={22} color={Theme.colors.primary} />
          <Text style={styles.retakeText}>Nueva foto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  animationArea: {
    height: 110,
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
  statusLabelContainer: {
    minHeight: 20,
    width: "100%",
  },
  statusLabel: {
    fontSize: Theme.typography.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  visualizerArea: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -150, // ← mueve ondas ↑ o ↓
  },
  chatBox: {
    maxHeight: "58%",
    width: "90%",
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  emptyState: {
    alignItems: "center",
    marginTop: Theme.spacing.lg,
    opacity: 0.7,
  },
  emptyStateText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sm,
    marginTop: Theme.spacing.sm,
    textAlign: "center",
  },
  bubble: {
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginVertical: Theme.spacing.xs,
    maxWidth: "88%",
    ...Theme.shadow.sm,
  },
  userBubble: {
    backgroundColor: Theme.colors.bubbleUser,
    alignSelf: "flex-end",
  },
  modelBubble: {
    backgroundColor: Theme.colors.bubbleAI,
    alignSelf: "flex-start",
  },
  userBubbleText: {
    fontSize: Theme.typography.base,
    lineHeight: 24,
    color: Theme.colors.bubbleUserText,
  },
  modelBubbleText: {
    fontSize: Theme.typography.base,
    lineHeight: 24,
    color: Theme.colors.bubbleAIText,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    ...Theme.shadow.sm,
    shadowOffset: { width: 0, height: -1 }, // sombra hacia arriba
  },
  micButton: {
    backgroundColor: Theme.colors.primary,
    width: 68,
    height: 68,
    borderRadius: Theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    ...Theme.shadow.md,
  },
  micButtonRecording: {
    backgroundColor: Theme.colors.error,
  },
  micButtonDisabled: {
    opacity: 0.45,
  },
  skipButton: {
    marginLeft: Theme.spacing.sm,
    backgroundColor: Theme.colors.primaryLight,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
  },
  retakeButton: {
    marginLeft: Theme.spacing.sm,
    backgroundColor: Theme.colors.primaryLight,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.xs,
  },
  retakeText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sm,
  },
  repeatButton: {
    alignSelf: "flex-start",
    marginTop: Theme.spacing.xs,
    padding: Theme.spacing.xs,
  },
});

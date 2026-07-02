import Ionicons from "@expo/vector-icons/Ionicons";
import { AudioModule, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { Camera, CameraCapturedPicture, CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme } from "../../constants/Theme";
import { analyzeImageWithGemini } from "../../services/GeminiService";
import { ImageStore } from "../../services/ImageStore";
import { VOICE_COMMAND_RECORDING_OPTIONS } from "../../services/recordingOptions";
import {
  TRANSCRIPTION_FAILED,
  transcribeAudioWithWhisper,
} from "../../services/transcribeAudioWithWhisper";
import { TTSService } from "../../services/TTSService";
import Header from "../Header";

// Escucha de confirmación por voz: máximo 3 s, con corte anticipado si se
// detectan 3 lecturas consecutivas (600 ms) por debajo de -40 dB tras oír voz.
const MAX_LISTEN_MS = 3000;
const METERING_POLL_INTERVAL_MS = 200;
const SILENCE_THRESHOLD_DB = -40;
const SILENCE_POLLS_TO_STOP = 3;

export default function CameraFunction() {
  const { selectedLanguage = "es" } = useLocalSearchParams<{
    selectedLanguage: string;
  }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const [currentProject, setCurrentProject] = useState("Proyecto 1");
  const [cameraPermission, setCameraPermission] = useState<
    boolean | undefined
  >();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<
    boolean | undefined
  >();
  const [facing] = useState<"front" | "back">("back");
  const [photo, setPhoto] = useState<CameraCapturedPicture | undefined>(
    undefined,
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  // Bloquea el botón de captura mientras una captura anterior sigue en proceso
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showLottie, setShowLottie] = useState<boolean>(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);
  const [imageCount, setImageCount] = useState(ImageStore.getImages().length);

  const cameraRef = useRef<CameraView>(null);
  const lottieRef = useRef<LottieView>(null);
  const recorder = useAudioRecorder(VOICE_COMMAND_RECORDING_OPTIONS);

  useEffect(() => {
    (async () => {
      const camPerm = await Camera.requestCameraPermissionsAsync();
      const libPerm = await MediaLibrary.requestPermissionsAsync();
      const micPerm = await AudioModule.requestRecordingPermissionsAsync();

      setCameraPermission(camPerm.status === "granted");
      setMediaLibraryPermission(libPerm.status === "granted");

      if (
        camPerm.status === "granted" &&
        libPerm.status === "granted" &&
        micPerm.status === "granted"
      ) {
        setCameraKey((prev) => prev + 1);
      }
    })();
  }, []);

  if (cameraPermission === undefined || mediaLibraryPermission === undefined) {
    return <Text>Solicitando permisos...</Text>;
  } else if (!cameraPermission) {
    return <Text>No se concedió permiso para usar la cámara.</Text>;
  }

  const takePic = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      // quality 0.4: Gemini no necesita máxima resolución y el payload base64
      // se reduce varias veces, recortando la latencia de subida en móvil.
      const options = { quality: 0.4, base64: true, exif: false };
      const newPhoto = await cameraRef.current.takePictureAsync(options);
      setPhoto(newPhoto);
      setButtonsVisible(false);

      setIsAnalyzing(true);
      setShowLottie(false);

      if (newPhoto.base64) {
        ImageStore.addImage(newPhoto.base64);
        setImageCount(ImageStore.getImages().length);

        const shortPrompt =
          "You are an expert software development assistant. Observe this image and provide a brief but clear description of what you see. End your response with a natural, open-ended question that invites the user to ask more about what they see.";
        const description = await analyzeImageWithGemini(
          newPhoto.base64,
          shortPrompt,
        );
        // La pantalla de chat consumirá esta descripción y se ahorrará la
        // llamada inicial a Gemini (elimina el doble roundtrip).
        ImageStore.setPendingDescription(description);

        setShowLottie(true);
        TTSService.speak(
          "Imagen procesada correctamente. Di 'sí' para continuar al análisis detallado.",
          voiceLang,
          () => {
            setTimeout(() => {
              handleVoiceConfirmation();
            }, 500);
          },
        );
      } else {
        TTSService.speak(
          "No se pudo capturar imagen en formato base64.",
          voiceLang,
        );
        setButtonsVisible(true);
      }
    } catch (error: any) {
      console.error("Error analizando la imagen:", error);

      const message =
        error?.message ??
        "Fallo en el análisis de la imagen, intenta nuevamente.";

      TTSService.speak(message, voiceLang);
      setButtonsVisible(true);
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };

  const handleVoiceConfirmation = async () => {
    const voiceInput = await listenForYes();
    if (
      voiceInput.toLowerCase().includes("sí") ||
      voiceInput.toLowerCase().includes("yes")
    ) {
      router.push({
        pathname: "/image-chat-screen",
        params: { selectedLanguage },
      });
    } else {
      setButtonsVisible(true);
    }
  };

  // Lee el nivel de audio (dB) de forma defensiva: devuelve undefined si la
  // API de estado o el metering no están disponibles en esta plataforma.
  const getMeteringSafe = (): number | undefined => {
    try {
      const status =
        typeof recorder.getStatus === "function"
          ? recorder.getStatus()
          : undefined;
      return typeof status?.metering === "number" ? status.metering : undefined;
    } catch {
      return undefined;
    }
  };

  // Espera el fin del habla: gana el primero entre el límite de 3 s y la
  // detección de silencio. Sin metering disponible, el límite de 3 s decide.
  const waitForSpeechEnd = async (): Promise<void> => {
    let silenceInterval: ReturnType<typeof setInterval> | undefined;

    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, MAX_LISTEN_MS),
    );

    const silenceDetected = new Promise<void>((resolve) => {
      // Sólo cuenta silencio después de haber oído voz; si no, el silencio
      // inicial (antes de que el usuario reaccione) cortaría la grabación.
      let heardSpeech = false;
      let silentPolls = 0;
      silenceInterval = setInterval(() => {
        const metering = getMeteringSafe();
        if (metering === undefined) return;
        if (metering >= SILENCE_THRESHOLD_DB) {
          heardSpeech = true;
          silentPolls = 0;
        } else if (heardSpeech) {
          silentPolls++;
          if (silentPolls >= SILENCE_POLLS_TO_STOP) resolve();
        }
      }, METERING_POLL_INTERVAL_MS);
    });

    try {
      await Promise.race([timeout, silenceDetected]);
    } finally {
      if (silenceInterval) clearInterval(silenceInterval);
    }
  };

  const listenForYes = async (): Promise<string> => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      console.log("🎤 Grabando...");

      await waitForSpeechEnd();

      await recorder.stop();
      const uri = recorder.uri;
      console.log("📁 Audio grabado en:", uri);

      if (uri) {
        const result = await transcribeAudioWithWhisper(uri, selectedLanguage);
        // Fallo de transcripción: tratar como respuesta vacía para que
        // handleVoiceConfirmation vuelva a mostrar los botones sin navegar.
        if (result === TRANSCRIPTION_FAILED) return "";
        return result || "";
      }
      return "";
    } catch (err) {
      console.error("Error al grabar/transcribir audio:", err);
      return "";
    }
  };

  const savePhoto = () => {
    if (!photo) return;
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(undefined);
    });
  };

  const discardPhoto = () => {
    TTSService.stop();
    setPhoto(undefined);
    setShowLottie(false);
    setButtonsVisible(false);
    // Sólo descarta la foto recién tomada; conserva las demás de la sesión
    ImageStore.removeLatest();
    setImageCount(ImageStore.getImages().length);
  };

  const clearImages = () => {
    ImageStore.clear();
    setImageCount(0);
  };

  const showHeader = false;

  if (photo) {
    return (
      <SafeAreaView style={styles.imageContainer}>
        <Image style={styles.preview} source={{ uri: photo.uri }} />
        <View style={styles.descriptionContainer}>
          {isAnalyzing ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={Theme.colors.primary} />
              <Text style={styles.loadingText}>Analizando imagen...</Text>
            </View>
          ) : showLottie ? (
            <View style={styles.lottieContainer}>
              <LottieView
                ref={lottieRef}
                source={require("../../assets/animations/image-processed.json")}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
              <Text style={styles.confirmText}>
                Imagen procesada correctamente. Esperando confirmación...
              </Text>
            </View>
          ) : null}
        </View>

        {buttonsVisible && (
          <View style={styles.btnContainer}>
            {mediaLibraryPermission && (
              <TouchableOpacity style={styles.btn} onPress={savePhoto}>
                <Ionicons
                  name="save-outline"
                  size={30}
                  color={Theme.colors.textPrimary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btn} onPress={discardPhoto}>
              <Ionicons
                name="trash-outline"
                size={30}
                color={Theme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <Header
          currentProject={currentProject}
          onProjectChange={setCurrentProject}
        />
      )}
      {cameraPermission && (
        <CameraView
          key={cameraKey}
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        />
      )}
      <View style={styles.sessionInfoContainer}>
        <Text style={styles.imageCounterText}>
          {imageCount}/{ImageStore.MAX_IMAGES} imágenes
        </Text>
        {imageCount > 0 && (
          <TouchableOpacity
            style={styles.clearImagesButton}
            onPress={clearImages}
            accessibilityLabel="Borrar todas las imágenes de la sesión"
          >
            <Ionicons
              name="trash-bin-outline"
              size={16}
              color={Theme.colors.textOnPrimary}
            />
            <Text style={styles.clearImagesText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.shutterContainer}>
        <TouchableOpacity
          style={styles.captureButtonOuter}
          onPress={takePic}
          activeOpacity={0.7}
          disabled={isProcessing}
          accessibilityLabel="Tomar foto"
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: Theme.colors.textPrimary, // base oscura para la cámara
  },
  camera: { flex: 1 },
  shutterContainer: {
    position: "absolute",
    bottom: Theme.spacing.lg,
    width: "100%",
    alignItems: "center",
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: Theme.radius.full,
    borderWidth: 4,
    borderColor: Theme.colors.textOnPrimary,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.textOnPrimary,
  },
  imageContainer: {
    height: "95%",
    width: "100%",
  },
  preview: {
    alignSelf: "stretch",
    flex: 0.7,
  },
  descriptionContainer: {
    flex: 0.3,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderTopLeftRadius: Theme.radius.lg,
    borderTopRightRadius: Theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...Theme.shadow.sm,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8, // sombra hacia arriba
  },
  lottieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.base,
    fontWeight: Theme.typography.medium,
    textAlign: "center",
    color: Theme.colors.textPrimary,
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
  },
  loadingText: {
    fontSize: Theme.typography.base,
    color: Theme.colors.textSecondary,
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.sm,
  },
  btn: {
    justifyContent: "center",
    margin: Theme.spacing.sm,
    elevation: 5,
  },
  sessionInfoContainer: {
    // Offsets propios del posicionamiento absoluto sobre la cámara
    position: "absolute",
    top: 50,
    right: 16,
    alignItems: "flex-end",
  },
  imageCounterText: {
    color: Theme.colors.textOnPrimary,
    fontSize: Theme.typography.sm,
    fontWeight: Theme.typography.bold,
    backgroundColor: Theme.colors.overlay,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.full,
    overflow: "hidden",
  },
  clearImagesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Theme.spacing.sm,
    backgroundColor: Theme.colors.overlay,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.full,
  },
  clearImagesText: {
    color: Theme.colors.textOnPrimary,
    fontSize: Theme.typography.sm,
    marginLeft: Theme.spacing.xs,
  },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { Camera, CameraCapturedPicture, CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeImageWithGemini } from "../../services/GeminiService";
import { ImageStore } from "../../services/ImageStore";
import { TTSService } from "../../services/TTSService";
import { transcribeAudioWithWhisper } from "../../services/transcribeAudioWithWhisper";
import Header from "../Header";

export default function CameraFunction() {
  const { selectedLanguage = "es" } = useLocalSearchParams<{ selectedLanguage: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const [currentProject, setCurrentProject] = useState("Proyecto 1");
  const [cameraPermission, setCameraPermission] = useState<boolean | undefined>();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | undefined>();
  const [facing] = useState<"front" | "back">("back");
  const [photo, setPhoto] = useState<CameraCapturedPicture | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  // Bloquea el botón de captura mientras una captura anterior sigue en proceso
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showLottie, setShowLottie] = useState<boolean>(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);
  const [imageCount, setImageCount] = useState(ImageStore.getImages().length);

  const cameraRef = useRef<CameraView>(null);
  const lottieRef = useRef<LottieView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      const camPerm = await Camera.requestCameraPermissionsAsync();
      const libPerm = await MediaLibrary.requestPermissionsAsync();
      const micPerm = await AudioModule.requestRecordingPermissionsAsync();

      setCameraPermission(camPerm.status === "granted");
      setMediaLibraryPermission(libPerm.status === "granted");

      if (camPerm.status === "granted" && libPerm.status === "granted" && micPerm.status === "granted") {
        setCameraKey(prev => prev + 1);
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
      const options = { quality: 1, base64: true, exif: false };
      const newPhoto = await cameraRef.current.takePictureAsync(options);
      setPhoto(newPhoto);
      setButtonsVisible(false);

      setIsAnalyzing(true);
      setShowLottie(false);

      if (newPhoto.base64) {
        ImageStore.addImage(newPhoto.base64);
        setImageCount(ImageStore.getImages().length);

        const shortPrompt = "Describe brevemente el contenido visible en esta imagen de código o interfaz.";
        await analyzeImageWithGemini(newPhoto.base64, shortPrompt);

        setShowLottie(true);
        TTSService.speak(
          "Imagen procesada correctamente. Di 'sí' para continuar al análisis detallado.",
          voiceLang,
          () => {
            setTimeout(() => {
              handleVoiceConfirmation();
            }, 500);
          }
        );
      } else {
        TTSService.speak("No se pudo capturar imagen en formato base64.", voiceLang);
        setButtonsVisible(true);
      }
    } catch (error: any) {
      console.error("Error analizando la imagen:", error);

      const message = error?.message ?? "Fallo en el análisis de la imagen, intenta nuevamente.";

      TTSService.speak(message, voiceLang);
      setButtonsVisible(true);
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };

  const handleVoiceConfirmation = async () => {
    const voiceInput = await listenForYes();
    if (voiceInput.toLowerCase().includes("sí") || voiceInput.toLowerCase().includes("yes")) {
      router.push({
        pathname: "/image-chat-screen",
        params: { selectedLanguage },
      });
    } else {
      setButtonsVisible(true);
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

      await new Promise(resolve => setTimeout(resolve, 6000));

      await recorder.stop();
      const uri = recorder.uri;
      console.log("📁 Audio grabado en:", uri);

      if (uri) {
        const result = await transcribeAudioWithWhisper(uri, selectedLanguage);
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
            <Text style={styles.loadingText}>Analizando imagen...</Text>
          ) : showLottie ? (
            <View style={styles.lottieContainer}>
              <LottieView
                ref={lottieRef}
                source={require("../../assets/animations/image-processed.json")}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
              <Text style={styles.confirmText}>Imagen procesada correctamente. Esperando confirmación...</Text>
            </View>
          ) : null}
        </View>

        {buttonsVisible && (
          <View style={styles.btnContainer}>
            {mediaLibraryPermission && (
              <TouchableOpacity style={styles.btn} onPress={savePhoto}>
                <Ionicons name="save-outline" size={30} color="black" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btn} onPress={discardPhoto}>
              <Ionicons name="trash-outline" size={30} color="black" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <Header currentProject={currentProject} onProjectChange={setCurrentProject} />
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
            <Ionicons name="trash-bin-outline" size={16} color="white" />
            <Text style={styles.clearImagesText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.shutterContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={takePic}
          disabled={isProcessing}
          accessibilityLabel="Tomar foto"
        >
          <Ionicons
            name="aperture-outline"
            size={100}
            color={isProcessing ? "gray" : "white"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  camera: { flex: 1 },
  shutterContainer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "transparent",
    padding: 10,
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
    backgroundColor: "white",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  lottieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    color: "#333",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: "white",
  },
  btn: {
    justifyContent: "center",
    margin: 10,
    elevation: 5,
  },
  sessionInfoContainer: {
    position: "absolute",
    top: 50,
    right: 16,
    alignItems: "flex-end",
  },
  imageCounterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  clearImagesButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearImagesText: {
    color: "white",
    fontSize: 13,
    marginLeft: 4,
  },
});

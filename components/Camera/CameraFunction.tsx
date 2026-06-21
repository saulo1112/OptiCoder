import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { Camera, CameraCapturedPicture, CameraView } from "expo-camera";
import { CameraType } from "expo-camera/build/Camera.types";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
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
import * as SpeechRecognition from "../../services/transcribeAudioWithWhisper";
import Header from "../Header";

export default function CameraFunction() {
  const { selectedLanguage = "es" } = useLocalSearchParams<{ selectedLanguage: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const [currentProject, setCurrentProject] = useState("Proyecto 1");
  const [cameraPermission, setCameraPermission] = useState<boolean | undefined>();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | undefined>();
  const [facing, setFacing] = useState<CameraType>("back");
  const [photo, setPhoto] = useState<CameraCapturedPicture | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showLottie, setShowLottie] = useState<boolean>(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const lottieRef = useRef<LottieView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    (async () => {
      const camPerm = await Camera.requestCameraPermissionsAsync();
      const libPerm = await MediaLibrary.requestPermissionsAsync();
      const micPerm = await Audio.requestPermissionsAsync();

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
    if (!cameraRef.current) return;

    const options = { quality: 1, base64: true, exif: false };
    const newPhoto = await cameraRef.current.takePictureAsync(options);
    setPhoto(newPhoto);
    setButtonsVisible(false);

    try {
      setIsAnalyzing(true);
      setShowLottie(false);

      if (newPhoto.base64) {
        ImageStore.setBase64(newPhoto.base64);

        const shortPrompt = "Describe brevemente el contenido visible en esta imagen de código o interfaz.";
        await analyzeImageWithGemini(newPhoto.base64, shortPrompt);

        setShowLottie(true);
        Speech.speak("Imagen procesada correctamente. Di 'sí' para continuar al análisis detallado.", {
          language: voiceLang,
          onDone: () => {
            setTimeout(() => {
              handleVoiceConfirmation();
            }, 500);
          },
        });
      } else {
        Speech.speak("No se pudo capturar imagen en formato base64.", { language: voiceLang });
        setButtonsVisible(true);
      }
    } catch (error: any) {
      console.error("Error analizando la imagen:", error);

      const message = error?.message ?? "Fallo en el análisis de la imagen, intenta nuevamente.";

      Speech.speak(message, { language: voiceLang });
      setButtonsVisible(true);
    } finally {
      setIsAnalyzing(false);
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      console.log("🎤 Grabando...");

      await new Promise(resolve => setTimeout(resolve, 6000));

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("📁 Audio grabado en:", uri);

      if (uri) {
        const result = await SpeechRecognition.transcribeAudioWithWhisper(uri);
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
    Speech.stop();
    setPhoto(undefined);
    setShowLottie(false);
    setButtonsVisible(false);
    ImageStore.clear();
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
                <Ionicons name="save-outline" size={30} color="#0057A4" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btn} onPress={discardPhoto}>
              <Ionicons name="trash-outline" size={30} color="#D32F2F" />
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
      <View style={styles.shutterContainer}>
        <TouchableOpacity style={styles.captureButtonOuter} onPress={takePic} activeOpacity={0.7}>
          <View style={styles.captureButtonInner} />
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
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
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
});
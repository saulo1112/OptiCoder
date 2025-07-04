import Ionicons from "@expo/vector-icons/Ionicons";
import { Camera, CameraCapturedPicture, CameraView } from "expo-camera";
import { CameraType } from "expo-camera/build/Camera.types";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeImageWithGemini } from "../../services/GeminiService";
import Header from "../Header";
import { speakText } from "../TextToSpeechPlayer";

export default function CameraFunction() {
  const { selectedLanguage = "es" } = useLocalSearchParams<{ selectedLanguage: string }>();
  const voiceLang = selectedLanguage === "es" ? "es-ES" : "en-US";

  const [currentProject, setCurrentProject] = useState("Proyecto 1");
  const [cameraPermission, setCameraPermission] = useState<boolean | undefined>();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | undefined>();
  const [facing, setFacing] = useState<CameraType>("back");
  const [photo, setPhoto] = useState<CameraCapturedPicture | undefined>(undefined);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const camPerm = await Camera.requestCameraPermissionsAsync();
      const libPerm = await MediaLibrary.requestPermissionsAsync();
      const micPerm = await Camera.requestMicrophonePermissionsAsync();
      setCameraPermission(camPerm.status === "granted");
      setMediaLibraryPermission(libPerm.status === "granted");
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

    try {
      setIsAnalyzing(true);
      setImageDescription(null);

      if (newPhoto.base64) {
        const description = await analyzeImageWithGemini(newPhoto.base64);
        setImageDescription(description);
        speakText(description, voiceLang);
        Speech.speak("Procesamiento avanzado disponible", { language: voiceLang });
      } else {
        const fallback = "No se pudo capturar imagen en formato base64.";
        setImageDescription(fallback);
        speakText(fallback, voiceLang);
      }
    } catch (error) {
      console.error("Error analizando la imagen:", error);
      const errorMsg = "Fallo en el análisis. Intenta nuevamente.";
      setImageDescription(errorMsg);
      speakText(errorMsg, voiceLang);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const savePhoto = () => {
    if (!photo) return;
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(undefined);
      setImageDescription(null);
    });
  };

  const discardPhoto = () => {
    Speech.stop();
    setPhoto(undefined);
    setImageDescription(null);
  };

  if (photo) {
    return (
      <SafeAreaView style={styles.imageContainer}>
        <Image style={styles.preview} source={{ uri: photo.uri }} />
        <View style={styles.descriptionContainer}>
          {isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Analizando imagen...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.descriptionText}>
                {imageDescription || "Sin descripción disponible."}
              </Text>
            </ScrollView>
          )}
        </View>
        <View style={styles.btnContainer}>
          {mediaLibraryPermission && (
            <TouchableOpacity style={styles.btn} onPress={savePhoto}>
              <Ionicons name="save-outline" size={30} color="black" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btn} onPress={discardPhoto}>
            <Ionicons name="trash-outline" size={30} color="black" />
          </TouchableOpacity>
          {imageDescription && !isAnalyzing && (
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.push("/image-chat-screen")}
            >
              <Ionicons name="chatbox-ellipses-outline" size={30} color="black" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const showHeader = false;

  return (
    <View style={styles.container}>
      {showHeader && (
        <Header currentProject={currentProject} onProjectChange={setCurrentProject} />
      )}
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
      <View style={styles.shutterContainer}>
        <TouchableOpacity style={styles.button} onPress={takePic}>
          <Ionicons name="aperture-outline" size={100} color="white" />
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
  },
  scrollContent: {
    paddingBottom: 20,
  },
  descriptionText: {
    fontSize: 18,
    color: "#333",
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});

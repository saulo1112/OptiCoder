import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { Camera, CameraCapturedPicture, CameraView } from "expo-camera";
import { CameraType } from "expo-camera/build/Camera.types";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
// import { uploadImageToCloudinary } from "../../services/CloudinaryService"; ❌ Eliminado
// import { analyzeImageUrl } from "../../services/OpenAIService"; ❌ Eliminado
import { analyzeImageWithGemini } from "../../services/GeminiService"; // ✅ Usando Gemini

export default function CameraFunction() {
    const [cameraPermission, setCameraPermission] = useState<boolean | undefined>();
    const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | undefined>();
    const [facing, setFacing] = useState<CameraType>("back");
    const [photo, setPhoto] = useState<CameraCapturedPicture | undefined>(undefined);
    const [imageDescription, setImageDescription] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const cameraRef = useRef<CameraView>(null);
    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            const cameraPermission = await Camera.requestCameraPermissionsAsync();
            const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
            const microphonePermission = await Camera.requestMicrophonePermissionsAsync();
            setCameraPermission(cameraPermission.status === "granted" ? true : false);
            setMediaLibraryPermission(mediaLibraryPermission.status === "granted");
        })();
    }, []);

    if (
        cameraPermission === undefined ||
        mediaLibraryPermission === undefined
    ) {
        return <Text>Request Permissions....</Text>;
    } else if (!cameraPermission) {
        return (
            <Text>
                Permission for camera not granted. Please change this in settings
            </Text>
        );
    }

    function toggleCameraFacing() {
        setFacing((current) => (current === "back" ? "front" : "back"));
    }

    let takePic = async () => {
        if (!cameraRef.current) return;

        let options = {
            quality: 1,
            base64: true,
            exif: false,
        };

        let newPhoto = await cameraRef.current.takePictureAsync(options);
        setPhoto(newPhoto);

        try {
            setIsAnalyzing(true);
            setImageDescription(null);

            if (newPhoto && newPhoto.base64) {
                const description = await analyzeImageWithGemini(newPhoto.base64);
                setImageDescription(description);
            } else {
                setImageDescription("Failed to capture image with base64 data.");
            }
        } catch (error) {
            console.error("Error analyzing image:", error);
            setImageDescription("Failed to analyze image. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (photo) {
        let savePhoto = () => {
            MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
                setPhoto(undefined);
                setImageDescription(null);
            });
        };

        let discardPhoto = () => {
            setPhoto(undefined);
            setImageDescription(null);
        };

        return (
            <SafeAreaView style={styles.imageContainer}>
                <Image style={styles.preview} source={{ uri: photo.uri }} />
                <View style={styles.descriptionContainer}>
                    {isAnalyzing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0000ff" />
                            <Text style={styles.loadingText}>Analyzing image...</Text>
                        </View>
                    ) : (
                        <Text style={styles.descriptionText}>
                            {imageDescription || "No description available"}
                        </Text>
                    )}
                </View>
                <View style={styles.btnContainer}>
                    {mediaLibraryPermission ? (
                        <TouchableOpacity style={styles.btn} onPress={savePhoto}>
                            <Ionicons name="save-outline" size={30} color="black" />
                        </TouchableOpacity>
                    ) : undefined}
                    <TouchableOpacity style={styles.btn} onPress={discardPhoto}>
                        <Ionicons name="trash-outline" size={30} color="black" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                ref={cameraRef}
            >
                <View style={styles.shutterContainer}>
                    <TouchableOpacity style={styles.button} onPress={takePic}>
                        <Ionicons name="aperture-outline" size={100} color="white" />
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
    },
    camera: {
        flex: 1,
    },
    shutterContainer: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        bottom: 0,
        position: "absolute",
    },
    button: {
        flex: 1,
        alignSelf: "flex-end",
        alignItems: "center",
    },
    btnContainer: {
        display: "flex",
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

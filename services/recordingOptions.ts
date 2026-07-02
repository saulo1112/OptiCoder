import { RecordingOptions, RecordingPresets, useAudioRecorder } from "expo-audio";

// Opciones de grabación para comandos de voz cortos (1-5 s).
// Parte de LOW_QUALITY para reducir el tamaño del audio enviado a Whisper,
// pero fuerza AAC/m4a en Android: el LOW_QUALITY de fábrica graba 3gp/AMR-NB,
// un formato que la API de Whisper no acepta.
// isMeteringEnabled permite la detección de silencio en CameraFunction.
export const VOICE_COMMAND_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.LOW_QUALITY,
  android: {
    extension: ".m4a",
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
  isMeteringEnabled: true,
};

const METERING_POLL_INTERVAL_MS = 200;
const SILENCE_THRESHOLD_DB = -40;
const SILENCE_POLLS_TO_STOP = 4; // 4 × 200 ms = 800 ms de silencio tras habla

// Lee el nivel de audio (dB) de forma defensiva: devuelve undefined si la API
// de estado o el metering no están disponibles en esta plataforma.
function getMeteringSafe(
  recorder: ReturnType<typeof useAudioRecorder>
): number | undefined {
  try {
    const status =
      typeof recorder.getStatus === "function" ? recorder.getStatus() : undefined;
    return typeof status?.metering === "number" ? status.metering : undefined;
  } catch {
    return undefined;
  }
}

// Espera el fin del habla: gana el primero entre el límite de maxMs y la
// detección de silencio. Sin metering disponible, el límite de tiempo decide.
// Nunca rechaza; cualquier error cae al timeout.
export async function waitForSpeechEnd(
  recorder: ReturnType<typeof useAudioRecorder>,
  maxMs: number = 8000
): Promise<void> {
  let silenceInterval: ReturnType<typeof setInterval> | undefined;

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, maxMs));

  const silenceDetected = new Promise<void>((resolve) => {
    // Sólo cuenta silencio después de haber oído voz; si no, el silencio
    // inicial (antes de que el usuario reaccione) cortaría la grabación.
    let heardSpeech = false;
    let silentPolls = 0;
    silenceInterval = setInterval(() => {
      const metering = getMeteringSafe(recorder);
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
}

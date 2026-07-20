import { OPENAI_API_KEY } from "../config/env";

const MAX_ATTEMPTS = 2; // 1 intento + 1 reintento automático

// Valor centinela: los llamadores deben compararlo para distinguir un fallo
// de transcripción de un texto real del usuario (nunca enviarlo a Gemini).
export const TRANSCRIPTION_FAILED = "__TRANSCRIPTION_FAILED__";

export async function transcribeAudioWithWhisper(
  uri: string,
  language: string = "en"
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "audio.wav",
        // La grabación es AAC/m4a (ver recordingOptions.ts); Whisper detecta
        // el formato por el contenido, no por el nombre del archivo.
        type: "audio/mp4",
      } as any);

      formData.append("model", "whisper-1");
      formData.append("language", language);

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          // No fijar Content-Type manualmente: fetch/FormData necesitan generar
          // el boundary automáticamente, o la API rechaza el multipart.
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcripción fallida: ${response.statusText}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error: any) {
      console.error(`Error en Whisper (intento ${attempt}/${MAX_ATTEMPTS}):`, error);
      if (attempt === MAX_ATTEMPTS) {
        return TRANSCRIPTION_FAILED;
      }
    }
  }

  return TRANSCRIPTION_FAILED;
}

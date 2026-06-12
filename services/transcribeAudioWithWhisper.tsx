import { OPENAI_API_KEY } from "../config/env";

const MAX_ATTEMPTS = 2; // 1 intento + 1 reintento automático

export async function transcribeAudioWithWhisper(
  uri: string,
  language: string = "es"
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "audio.wav",
        type: "audio/wav",
      } as any);

      formData.append("model", "whisper-1");
      formData.append("language", language);

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "multipart/form-data",
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
        return "No se pudo transcribir el audio.";
      }
    }
  }

  return "No se pudo transcribir el audio.";
}

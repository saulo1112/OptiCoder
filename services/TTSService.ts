import * as Speech from "expo-speech";

/**
 * Gestor centralizado de texto a voz (TTS).
 * Garantiza que nunca haya dos locuciones superpuestas: cada speak() detiene
 * primero cualquier locución en curso. Usar siempre esta instancia única en
 * lugar de llamar a expo-speech directamente.
 */
class TTSManager {
  private speaking = false;
  // Identificador de la locución activa: evita que los callbacks de una
  // locución interrumpida pisen el estado de la siguiente.
  private utteranceId = 0;

  speak(text: string, language: string, onDone?: () => void): void {
    this.stop();

    if (!text?.trim()) {
      onDone?.();
      return;
    }

    const id = ++this.utteranceId;
    this.speaking = true;

    Speech.speak(text, {
      language,
      onDone: () => {
        if (id === this.utteranceId) this.speaking = false;
        onDone?.();
      },
      onStopped: () => {
        if (id === this.utteranceId) this.speaking = false;
      },
      onError: (e) => {
        console.log("[TTSService] error:", e);
        if (id === this.utteranceId) this.speaking = false;
      },
    });
  }

  stop(): void {
    this.utteranceId++;
    this.speaking = false;
    Speech.stop();
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

export const TTSService = new TTSManager();
export default TTSService;

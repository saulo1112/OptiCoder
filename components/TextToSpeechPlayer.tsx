// src/components/TTS/TextToSpeechPlayer.tsx

import * as Speech from 'expo-speech';

/**
 * Reproduce el texto como audio utilizando expo-speech.
 * @param text Texto a vocalizar.
 * @param language Idioma (por defecto 'es-ES' para español).
 */
export function speakText(text: string, language: string = 'es-ES') {
  if (!text) return;

  Speech.speak(text, {
    language,
    rate: 0.9,     // Velocidad de habla (0.1 a 1.0)
    pitch: 1.0,    // Tono (0.5 a 2.0)
    volume: 1.0,   // Volumen (0.0 a 1.0)
  });
}

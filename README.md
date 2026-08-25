# OptiCoder

**English** | [Español](#español)

> A mobile assistant that reads code screenshots, UI mockups, and technical diagrams aloud, for developers who can't see them.

OptiCoder points a phone camera at a screen and gets back a spoken description in natural language: what the code does, what a diagram represents, what's on screen. Built with **React Native** and **Expo**, it targets accessibility from the first screen, not as an add-on, and runs on mid-range Android hardware rather than assuming a flagship device.

---

## How to run it

### Prerequisites
- Node.js ≥ 18.x
- Expo CLI installed globally: `npm install -g expo-cli`
- Android Studio (for an emulator) or a physical Android device with USB debugging enabled
- API keys for Google Gemini and OpenAI (copy `.env.example` to `.env` and fill them in)

> Gemini accepts images directly as base64, which keeps the pipeline simple. OpenAI's vision API needs a public image URL instead, which would mean routing through an external host. For that reason Gemini is the default vision provider (with a generous free tier) and OpenAI/Whisper handles voice transcription, where it's fast and accurate.

### Run the app
```bash
npx expo run:android
```

### Alternatives
- Quick iteration in Expo Go (limited, not recommended — see below):
  ```bash
  npx expo start
  ```
- Build an APK:
  ```bash
  eas build -p android --profile preview
  ```

### Why a development build / emulator
The app needs native camera access, audio recording, and base64 image handling, none of which Expo Go supports. Building directly through EAS also has a monthly build limit on the free tier, so a local emulator or dev build is the faster iteration loop.

## Project structure

```
OptiCoder/
├── app/                              # Expo Router screens
│   ├── _layout.tsx                     # Root layout and navigation
│   ├── index.tsx                       # Entry screen
│   ├── camera.tsx                      # Camera capture screen
│   ├── image-chat-screen.tsx           # Conversational screen (image + voice)
│   └── +not-found.tsx
├── components/
│   ├── Camera/CameraFunction.tsx       # Camera capture logic
│   ├── VoiceVisualizer.tsx             # Animated waveform while recording
│   ├── WelcomeScreen.tsx
│   ├── Header.tsx
│   └── ui/, ThemedText.tsx, ThemedView.tsx, ...  # Shared UI primitives
├── services/
│   ├── VisionService.ts                # Single entry point: analyzeImage() dispatches to the active provider
│   ├── GeminiService.tsx               # Google Gemini vision analysis (default provider)
│   ├── OpenAIVisionService.tsx         # OpenAI vision analysis (fallback provider)
│   ├── transcribeAudioWithWhisper.tsx  # Speech-to-text (OpenAI Whisper)
│   ├── TTSService.ts                   # Text-to-speech playback
│   ├── ImageStore.ts                   # Temporary image caching between screens
│   ├── recordingOptions.ts             # Audio recording configuration
│   └── visionPrompt.ts                 # Prompt templates for the vision models
├── config/env.ts                      # Reads and validates EXPO_PUBLIC_* environment variables
├── constants/                         # Colors.ts, Theme.ts
├── hooks/                             # useColorScheme, useThemeColor
├── assets/animations/                 # Lottie files (welcome, loading, robot speaking, image processed)
├── android/                           # Native Android project (Expo prebuild output)
└── app.json, package.json, tsconfig.json
```

---

## Key components

### `camera.tsx`
Captures a photo with the rear camera via `expo-camera`'s `CameraView`, then hands it off to the chat screen.

### `image-chat-screen.tsx`
Sends the captured image to `VisionService`, speaks the model's response, and keeps the conversation going: the user can ask follow-up questions by voice, transcribed through Whisper and answered with the same vision context.

### `VoiceVisualizer`
Animated waveform shown while the microphone is recording.

### Animations
Lottie files in `assets/animations/`:
- `opticoderlogo.json` — welcome animation
- `loading-screen.json` — loading state
- `robot-speaking.json` — assistant speaking
- `ai-speaking.json` — waveform shown while the user talks
- `image-processed.json` — confirms the image finished processing

---

## AI architecture

`VisionService.analyzeImage()` is the single entry point every screen calls. It reads `AI_PROVIDER` from `config/env.ts` (`"gemini"` by default, or `"openai"`) and dispatches to `GeminiService` or `OpenAIVisionService` without the caller needing to know which one is active — switching providers is a single environment variable, not a code change. `TTSService` speaks the result back through `expo-speech`, and `transcribeAudioWithWhisper` turns the user's spoken follow-up into text for the next turn.

Environment variables are validated at startup (`config/env.ts`): a missing API key fails immediately with a clear error instead of a silent runtime failure deep in a network call.

---

## Notes

- The entire `image-chat-screen` flow can be driven by voice commands alone, with no need to touch the screen after the photo is taken.
- The service layer is intentionally modular (one file per concern: vision, transcription, speech, storage) to make adding a new provider or language a contained change.

---

## Author

- Built by **Saulo Quiñones Góngora**
- Supervised by **Germán Cuaya Simbro**
- Programa Delfín 2025 — Accessible mobile app with AI

---

# Español

[English](#opticoder) | **Español**

> Un asistente móvil que lee en voz alta capturas de código, mockups de interfaz y diagramas técnicos, para desarrolladores que no pueden verlos.

OptiCoder apunta la cámara del teléfono a una pantalla y devuelve una descripción hablada en lenguaje natural: qué hace el código, qué representa un diagrama, qué hay en pantalla. Construido con **React Native** y **Expo**, prioriza la accesibilidad desde la primera pantalla, no como algo agregado después, y corre en hardware Android de gama media, no solo en un equipo de gama alta.

---

## Cómo ejecutarlo

### Requisitos previos
- Node.js ≥ 18.x
- Expo CLI instalado globalmente: `npm install -g expo-cli`
- Android Studio (para emulador) o un dispositivo Android físico con depuración USB activada
- Claves API de Google Gemini y OpenAI (copia `.env.example` a `.env` y complétalas)

> Gemini acepta imágenes directamente en base64, lo que mantiene el flujo simple. La API de visión de OpenAI en cambio necesita una URL pública, lo que obligaría a pasar por un host externo. Por eso Gemini es el proveedor de visión por defecto (con una capa gratuita generosa) y OpenAI/Whisper se encarga de la transcripción de voz, donde es rápido y preciso.

### Ejecutar la app
```bash
npx expo run:android
```

### Alternativas
- Iteración rápida en Expo Go (limitada, no recomendada — ver abajo):
  ```bash
  npx expo start
  ```
- Compilar un APK:
  ```bash
  eas build -p android --profile preview
  ```

### Por qué un development build / emulador
La app necesita acceso nativo a la cámara, grabación de audio y manejo de imágenes en base64, nada de eso soportado por Expo Go. Compilar directamente con EAS también tiene un límite mensual de builds en el plan gratuito, así que un emulador local o un dev build es el ciclo de iteración más rápido.

## Estructura del proyecto

```
OptiCoder/
├── app/                              # Pantallas de Expo Router
│   ├── _layout.tsx                     # Layout raíz y navegación
│   ├── index.tsx                       # Pantalla de entrada
│   ├── camera.tsx                      # Pantalla de captura de cámara
│   ├── image-chat-screen.tsx           # Pantalla conversacional (imagen + voz)
│   └── +not-found.tsx
├── components/
│   ├── Camera/CameraFunction.tsx       # Lógica de captura de cámara
│   ├── VoiceVisualizer.tsx             # Ondas animadas mientras se graba
│   ├── WelcomeScreen.tsx
│   ├── Header.tsx
│   └── ui/, ThemedText.tsx, ThemedView.tsx, ...  # Primitivas de UI compartidas
├── services/
│   ├── VisionService.ts                # Punto de entrada único: analyzeImage() despacha al proveedor activo
│   ├── GeminiService.tsx               # Análisis de visión con Google Gemini (proveedor por defecto)
│   ├── OpenAIVisionService.tsx         # Análisis de visión con OpenAI (proveedor alterno)
│   ├── transcribeAudioWithWhisper.tsx  # Voz a texto (OpenAI Whisper)
│   ├── TTSService.ts                   # Reproducción de texto a voz
│   ├── ImageStore.ts                   # Almacenamiento temporal de imágenes entre pantallas
│   ├── recordingOptions.ts             # Configuración de grabación de audio
│   └── visionPrompt.ts                 # Plantillas de prompt para los modelos de visión
├── config/env.ts                      # Lee y valida las variables de entorno EXPO_PUBLIC_*
├── constants/                         # Colors.ts, Theme.ts
├── hooks/                             # useColorScheme, useThemeColor
├── assets/animations/                 # Archivos Lottie (bienvenida, carga, robot hablando, imagen procesada)
├── android/                           # Proyecto nativo de Android (salida de Expo prebuild)
└── app.json, package.json, tsconfig.json
```

---

## Componentes clave

### `camera.tsx`
Captura una foto con la cámara trasera vía `CameraView` de `expo-camera`, y la pasa a la pantalla de chat.

### `image-chat-screen.tsx`
Envía la imagen capturada a `VisionService`, dice en voz alta la respuesta del modelo, y mantiene la conversación: el usuario puede hacer preguntas de seguimiento por voz, transcritas con Whisper y respondidas con el mismo contexto visual.

### `VoiceVisualizer`
Ondas animadas que se muestran mientras el micrófono está grabando.

### Animaciones
Archivos Lottie en `assets/animations/`:
- `opticoderlogo.json` — animación de bienvenida
- `loading-screen.json` — estado de carga
- `robot-speaking.json` — asistente hablando
- `ai-speaking.json` — ondas que se muestran mientras el usuario habla
- `image-processed.json` — confirma que la imagen terminó de procesarse

---

## Arquitectura de IA

`VisionService.analyzeImage()` es el punto de entrada único que llama cada pantalla. Lee `AI_PROVIDER` de `config/env.ts` (`"gemini"` por defecto, o `"openai"`) y despacha a `GeminiService` u `OpenAIVisionService` sin que quien llama necesite saber cuál está activo: cambiar de proveedor es una sola variable de entorno, no un cambio de código. `TTSService` dice la respuesta en voz alta vía `expo-speech`, y `transcribeAudioWithWhisper` convierte la pregunta hablada del usuario en texto para el siguiente turno.

Las variables de entorno se validan al arrancar (`config/env.ts`): si falta una clave API, falla de inmediato con un error claro en vez de fallar en silencio en medio de una llamada de red.

---

## Notas

- Todo el flujo de `image-chat-screen` se puede manejar solo con comandos de voz, sin necesidad de tocar la pantalla después de tomar la foto.
- La capa de servicios es modular a propósito (un archivo por responsabilidad: visión, transcripción, voz, almacenamiento) para que agregar un nuevo proveedor o idioma sea un cambio contenido.

---

## Autor

- Desarrollado por **Saulo Quiñones Góngora**
- Dirigido por **Germán Cuaya Simbro**
- Programa Delfín 2025 — Aplicación móvil accesible con IA

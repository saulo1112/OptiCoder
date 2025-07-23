# 🤖 OptiCoder – Asistente Inteligente Accesible para Programadores con Discapacidad Visual

**OptiCoder** es una aplicación móvil desarrollada con **React Native** enfocada en la accesibilidad. Utiliza la cámara del dispositivo y herramientas de inteligencia artificial para interpretar imágenes y documentos, ofreciendo respuestas por voz en lenguaje natural. Está diseñada especialmente para personas con discapacidad visual que buscan asistencia en el desarrollo de software.

---

## 🚀 ¿Cómo ejecutar la aplicación?

### Requisitos previos:
- Node.js ≥ 18.x
- Expo CLI instalado globalmente: `npm install -g expo-cli`
- Android Studio (para emulador) o un dispositivo Android con modo desarrollador y la opción de depuración por USB (USB debugging) activada.
- Claves API de OpenAI y Gemini (Google AI)
- ⚠️ Nota: Se recomienda utilizar una combinación de las APIs de Gemini y OpenAI para un mejor desempeño. El modelo de Gemini permite procesar imágenes directamente en formato base64, lo cual simplifica el flujo sin necesidad de subirlas a un servidor externo. En contraste, la API de OpenAI requiere una URL pública para analizar imágenes, lo que obliga a utilizar servicios como Cloudinary. Por esta razón, se sugiere emplear Gemini para análisis de imágenes y generación de respuestas, aprovechando su prueba gratuita de 90 días, mientras que para la transcripción de voz a texto se recomienda el modelo Whisper de OpenAI, conocido por su alta precisión y bajo costo.


### Comando principal para correr la app:
```bash
npx expo run:android
```

### Alternativas:
- Para desarrollo rápido en Expo Go (con limitaciones):  
  ```bash
  npx expo start
  ```

- Para compilar una APK:  
  ```bash
  eas build -p android --profile preview
  ```

### ¿Por qué se recomienda un emulador?
- Se recomienda el uso de un emulador porque la app requiere ejecutarse en un development build para acceder a funcionalidades nativas como la cámara, audio y procesamiento de imágenes en base64, las cuales no son compatibles con Expo Go. Además, generar builds directamente desde Expo puede ser más demorado y tiene un límite mensual en su plan gratuito. El emulador permite probar la app de forma más ágil y sin consumir estos builds, facilitando el desarrollo iterativo.

## 📁 Estructura del proyecto

```
OptiCoder/
├── App.tsx
├── app/
│   ├── camera.tsx              # Pantalla para capturar imagen
│   └── image-chat-screen.tsx   # Pantalla de conversación con IA
├── assets/animations/          # Archivos Lottie (.json)
├── components/
│   ├── VoiceVisualizer.tsx     # Ondas de audio animadas
│   └── Header.tsx              # (Opcional) Encabezado reutilizable
├── services/
│   ├── GeminiService.ts        # Procesamiento de imagen con IA
│   ├── ImageStore.ts           # Almacenamiento temporal de imágenes
│   └── transcribeAudioWithWhisper.ts # Transcripción de voz
├── utils/                      # Funciones auxiliares (si aplica)
└── README.md
```

---

## 🧩 Componentes clave

### 📸 `CameraScreen`
- Permite tomar una fotografía desde la cámara trasera.
- Usa `CameraView` de `expo-camera`.
- Opcionalmente guarda la imagen y la pasa a `ImageChatScreen`.

### 🧠 `ImageChatScreen`
- Procesa automáticamente la imagen usando **Gemini** (IA de Google).
- Genera una descripción y una pregunta hablada para el usuario.
- Permite conversación por voz, con transcripción vía **Whisper**.
- Visualiza mensajes como burbujas de chat y utiliza animaciones de feedback (robot hablando, logo, ondas).

### 🗣️ `VoiceVisualizer`
- Componente visual que representa la grabación de voz mediante ondas animadas.

### 🎨 Animaciones
- Incluye animaciones Lottie en `assets/animations/`:
  - `opticoderlogo.json` → animación de bienvenida
  - `loading-screen.json` → animación de carga
  - `robot-speaking.json` → animación del asistente
  - `ai-speaking.json` → animación de ondas de sonido que hacen referencia al micrófono cuando el usuario habla
  - `image-processed.json` → animación que indica cuando la imagen ha sido procesada correctamente

---

## 🧠 Inteligencia Artificial
- **GeminiService**: Llama a la API de Google Gemini con la imagen codificada en Base64 y un prompt personalizado.
- **WhisperService**: Transcribe la voz del usuario en texto para responder en contexto.

---

## 📌 Observaciones adicionales
- Se puede acceder a la pantalla de **ImageChatScreen** usando netamente comandos de voz.
- La lógica está modularizada para facilitar el mantenimiento y la extensibilidad (ej. agregar nuevos idiomas o modelos de IA).

---

## 👨‍💻 Autor

Desarrollado por **Saulo Quiñones Góngora**
Dirigido por **Germán Cueya Simbro**  
**Programa Delfín 2025 – Aplicación móvil accesible con IA**
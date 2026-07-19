import { AI_PROVIDER } from "../config/env";
import { analyzeImageWithGemini } from "./GeminiService";
import { analyzeImageWithOpenAI } from "./OpenAIVisionService";

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

// Punto de entrada único para el análisis de imagen. Despacha al proveedor
// configurado en AI_PROVIDER (config/env.ts) sin que los componentes tengan que
// saber cuál está activo. Cambiar EXPO_PUBLIC_AI_PROVIDER (y reiniciar Expo)
// alterna entre Gemini y OpenAI.
export async function analyzeImage(
  images: string[] | string,
  userPrompt?: string,
  history: ChatTurn[] = []
): Promise<string> {
  if (AI_PROVIDER === "openai") {
    return analyzeImageWithOpenAI(images, userPrompt, history);
  }
  return analyzeImageWithGemini(images, userPrompt, history);
}

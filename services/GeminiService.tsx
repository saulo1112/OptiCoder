import { GEMINI_API_KEY } from "../config/env";
import { MAX_OUTPUT_TOKENS, VISION_SYSTEM_PROMPT } from "./visionPrompt";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-flash-latest"; // alias soportado en v1beta

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export async function analyzeImageWithGemini(
  images: string[] | string,
  userPrompt?: string,
  history: ChatTurn[] = []
): Promise<string> {
  const basePrompt = VISION_SYSTEM_PROMPT;

  try {
    // Compatibilidad hacia atrás: acepta una sola imagen (string) o varias (string[]).
    const imageList = (Array.isArray(images) ? images : [images]).filter(Boolean);

    if (
      imageList.length === 0 ||
      imageList.some((img) => !img || img.length < 100)
    ) {
      throw new Error("The base64 image is invalid or empty.");
    }

    const contents: any[] = [];

    // Turno inicial: prompt + todas las imágenes de la sesión
    contents.push({
      role: "user",
      parts: [
        { text: basePrompt },
        ...imageList.map((img) => ({
          inlineData: {
            mimeType: "image/jpeg",
            data: img,
          },
        })),
      ],
    });

    // Historial previo
    for (const turn of history) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.content }],
      });
    }

    // Prompt adicional del usuario
    if (userPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });
    }

    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    };

    const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Gemini API error HTTP:", response.status, response.statusText);
      console.error("Gemini API error body:", data);
      throw new Error(
        (data as any)?.error?.message ||
          `Image analysis failed. Code ${response.status}.`
      );
    }

    const output =
      (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (data as any)?.candidates?.[0]?.output_text;

    return output || "No description was found.";
  } catch (error: any) {
    console.error("Gemini API error (catch):", error);
    throw new Error(error?.message || "Image analysis failed.");
  }
}

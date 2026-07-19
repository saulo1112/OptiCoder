import { OPENAI_API_KEY } from "../config/env";
import { MAX_OUTPUT_TOKENS, VISION_SYSTEM_PROMPT } from "./visionPrompt";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Modelo de visión de OpenAI. gpt-4o-mini soporta imágenes y es económico, ideal
// para pruebas; puede subirse a "gpt-4o" si se necesita mayor calidad.
const OPENAI_VISION_MODEL = "gpt-4o-mini";

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

// Equivalente de analyzeImageWithGemini usando la API de visión de OpenAI.
// Misma firma y comportamiento: recibe una o varias imágenes base64, un prompt
// opcional del usuario y el historial, y devuelve texto siguiendo el mismo
// VISION_SYSTEM_PROMPT. Permite sustituir a Gemini cuando su API no está disponible.
export async function analyzeImageWithOpenAI(
  images: string[] | string,
  userPrompt?: string,
  history: ChatTurn[] = []
): Promise<string> {
  try {
    // Compatibilidad hacia atrás: acepta una sola imagen (string) o varias (string[]).
    const imageList = (Array.isArray(images) ? images : [images]).filter(Boolean);

    if (
      imageList.length === 0 ||
      imageList.some((img) => !img || img.length < 100)
    ) {
      throw new Error("The base64 image is invalid or empty.");
    }

    // OpenAI usa el rol "assistant" donde Gemini usa "model".
    const messages: any[] = [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: imageList.map((img) => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` },
        })),
      },
    ];

    // Historial previo
    for (const turn of history) {
      messages.push({
        role: turn.role === "model" ? "assistant" : "user",
        content: turn.content,
      });
    }

    // Prompt adicional del usuario
    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    const requestBody = {
      model: OPENAI_VISION_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages,
    };

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI API error HTTP:", response.status, response.statusText);
      console.error("OpenAI API error body:", data);
      throw new Error(
        (data as any)?.error?.message ||
          `Image analysis failed. Code ${response.status}.`
      );
    }

    const output = (data as any)?.choices?.[0]?.message?.content;

    return output || "No description was found.";
  } catch (error: any) {
    console.error("OpenAI API error (catch):", error);
    throw new Error(error?.message || "Image analysis failed.");
  }
}

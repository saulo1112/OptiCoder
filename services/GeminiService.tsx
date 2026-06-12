import { GEMINI_API_KEY } from "../config/env";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-flash-latest"; // alias soportado en v1beta

// Límite duro de tokens de salida: complementa la instrucción de brevedad del
// prompt para que las respuestas sean aptas para lectura por voz (TTS).
const MAX_OUTPUT_TOKENS = 300;

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export async function analyzeImageWithGemini(
  images: string[] | string,
  userPrompt?: string,
  history: ChatTurn[] = []
): Promise<string> {
  const basePrompt = `You are an expert software development assistant helping a developer with visual impairment understand technical visual content (code screenshots, UI mockups, architecture diagrams).

Follow these rules strictly:
1. Analyze the image SEMANTICALLY. Do NOT base your analysis on visual IDE annotations such as red underlines, yellow warnings, or squiggly lines. Evaluate the actual code logic and syntax independently.
2. If the image contains code: state explicitly in your OPENING sentence whether an error is present or not. If there is an error, identify its type, location (approximate line if visible), and cause. If there is no error, confirm this clearly and briefly.
3. Keep ALL responses under 3 sentences maximum. Prioritize clarity and brevity — your responses will be read aloud by a text-to-speech engine to the user.
4. If the user asks a follow-up question, answer it directly and concisely in no more than 2 sentences.
5. Do not add unsolicited suggestions, warnings, or commentary beyond what was asked.
6. If the image is not code (e.g. a UI mockup or architecture diagram), describe its purpose and main elements briefly in 2 sentences maximum.
7. Respond in the same language the user writes or speaks in. Default to Spanish.`;

  try {
    // Compatibilidad hacia atrás: acepta una sola imagen (string) o varias (string[]).
    const imageList = (Array.isArray(images) ? images : [images]).filter(Boolean);

    if (
      imageList.length === 0 ||
      imageList.some((img) => !img || img.length < 100)
    ) {
      throw new Error("La imagen base64 es inválida o está vacía.");
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
          `Fallo en el análisis de la imagen. Código ${response.status}.`
      );
    }

    const output =
      (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (data as any)?.candidates?.[0]?.output_text;

    return output || "No se encontró una descripción.";
  } catch (error: any) {
    console.error("Gemini API error (catch):", error);
    throw new Error(error?.message || "Fallo en el análisis de la imagen.");
  }
}

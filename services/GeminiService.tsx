const GEMINI_API_KEY = "AIzaSyAmmjLKyudgYiCA4qBov2i3eQA5ADu6YWg";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-flash-latest"; // alias soportado en v1beta

type ChatTurn = {
  role: "user" | "model";
  content: string;
};

export async function analyzeImageWithGemini(
  base64Image: string,
  userPrompt?: string,
  history: ChatTurn[] = []
): Promise<string> {
  const basePrompt = `Describe detalladamente esta imagen pensando en una persona con discapacidad visual que necesita comprender el contenido para trabajar en un proyecto de software.`;

  try {
    if (!base64Image || base64Image.length < 100) {
      throw new Error("La imagen base64 es inválida o está vacía.");
    }

    if (!GEMINI_API_KEY) {
      throw new Error("No hay una API key de Gemini configurada.");
    }

    const contents: any[] = [];

    // Turno inicial: prompt + imagen
    contents.push({
      role: "user",
      parts: [
        { text: basePrompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
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

    const requestBody = { contents };

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

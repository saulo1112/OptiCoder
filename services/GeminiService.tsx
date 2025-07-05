const GEMINI_API_KEY = "***REMOVED_GOOGLE_KEY***";

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

    // Construimos el contenido para Gemini: basePrompt + historial + nuevo turno
    const contents: any[] = [];

    // Turno inicial: imagen + basePrompt (solo una vez)
    contents.push({
      role: "user",
      parts: [
        { text: basePrompt },
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Image,
          },
        },
      ],
    });

    // Agregar historial si existe
    for (const turn of history) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.content }],
      });
    }

    // Agregar el nuevo prompt del usuario si existe
    if (userPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });
    }

    const requestBody = { contents };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      throw new Error(data.error?.message || "Fallo en el análisis de la imagen.");
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output || "No se encontró una descripción.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Fallo en el análisis de la imagen.");
  }
}

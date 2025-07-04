const GEMINI_API_KEY = "***REMOVED_GOOGLE_KEY***";
//Primera parte del prompt, descripción general de lo que se está haciendo. Responder en primera persona. Delimitar el prompt un poco más. Preguntar qué parte revisar en extenso. 1. Analizar la pantalla completa. 2. Solicitar por medio de voz qué parte revisar en extenso. 
// ¿Qué parte te gustaría revisar en extenso?
//Facilitar la interacción con el usuario.

export async function analyzeImageWithGemini(base64Image: string): Promise<string> {
  const prompt = `Eres un asistente de inteligencia artificial que ayuda a desarrolladores de software con discapacidad visual a comprender los aspectos visuales de proyectos de programación.

Tu tarea es analizar capturas de pantalla de editores de código, exploradores de archivos o diagramas, y describir su contenido de forma clara y detallada.

PAUTAS PARA LA RESPUESTA:

- Identifica si la imagen muestra código, una estructura de archivos, un diseño de interfaz (UI mockup) u otro tipo de contenido.
- Describe el lenguaje de programación si es visible (por ejemplo, Python, JavaScript).
- Menciona elementos clave como nombres de funciones, clases, variables, carpetas o nombres de archivos.
- Si la imagen incluye una terminal o entorno de desarrollo (IDE), describe qué se está ejecutando o editando.
- Usa referencias espaciales claras (parte superior, inferior, izquierda, derecha) para orientar al usuario.
- No omitas los pequeños detalles: incluye extensiones de archivos, patrones de indentación y comentarios visibles si se pueden leer.
- Usa viñetas si es apropiado y mantén siempre un tono objetivo y preciso.
- Evita asumir la intención del usuario: solo describe lo que está visible.
- Nunca menciones que eres una IA ni que estás analizando una imagen.`;

  try {
    if (!base64Image || base64Image.length < 100) {
      throw new Error("La imagen base64 es inválida o está vacía.");
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

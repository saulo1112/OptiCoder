const GEMINI_API_KEY = "***REMOVED_GOOGLE_KEY***";

export async function analyzeImageWithGemini(base64Image: string): Promise<string> {
  try {
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI assistant that helps visually impaired software developers understand visual aspects of programming projects.

              Your job is to analyze screenshots of code editors, file explorers, or diagrams, and describe their content clearly and thoroughly.

              RESPONSE GUIDELINES:

            - Identify if the image shows code, a file structure, a UI mockup, or something else.
            - Describe the programming language if visible (e.g., Python, JavaScript).
          - Mention key elements such as function names, classes, variables, folders, or filenames.
          - If the image includes a terminal or IDE, describe what is being executed or edited.
          - Use clear spatial references (top, bottom, left, right) to orient the user.
          - Do not skip small details — include file extensions, indentation patterns, and visible comments if readable.
          - Use bullet points if appropriate, and always be factual.
          - Avoid assuming the user's intent — only describe what’s visible.
          - Never mention that you're an AI or that you're analyzing an image.`,
            },
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
      throw new Error(data.error?.message || "Failed to analyze image");
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output || "No description available.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to analyze image.");
  }
}

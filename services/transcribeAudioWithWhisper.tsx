export async function transcribeAudioWithWhisper(uri: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "audio.wav",
      type: "audio/wav",
    } as any);

    formData.append("model", "whisper-1");
    formData.append("language", "es"); 

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcripción fallida: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error: any) {
    console.error("Error en Whisper:", error);
    return "No se pudo transcribir el audio.";
  }
}

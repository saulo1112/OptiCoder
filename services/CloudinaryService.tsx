// Configuración de tu Cloudinary
const CLOUDINARY_CLOUD_NAME = "dqqgqmn1k"; // Tu cloud name
const CLOUDINARY_UPLOAD_PRESET = "reactnative_unsigned"; // Nombre del upload preset

/**
 * Sube una imagen (en base64) a Cloudinary y devuelve la URL segura de la imagen.
 * @param base64 Imagen codificada en base64 sin prefijo data:image
 * @returns URL segura de la imagen subida
 */
export async function uploadImageToCloudinary(base64: string): Promise<string> {
  try {
    // Crear el FormData con la imagen y el preset
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64}`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Hacer el request a Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    // Procesar la respuesta
    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary upload error:", data);
      throw new Error(data.error?.message || "Failed to upload image");
    }

    // Devolver la URL segura
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload exception:", error);
    throw error;
  }
}

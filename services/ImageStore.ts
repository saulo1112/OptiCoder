// services/ImageStore.ts

// Almacén en memoria de las imágenes de la sesión actual.
// Mantiene hasta MAX_IMAGES imágenes con comportamiento de ventana deslizante:
// al superar el límite se descarta la más antigua.

const MAX_IMAGES = 3;

let images: string[] = [];

export const ImageStore = {
  MAX_IMAGES,

  addImage(base64: string) {
    if (!base64) return;
    images.push(base64);
    if (images.length > MAX_IMAGES) {
      images = images.slice(images.length - MAX_IMAGES);
    }
  },

  getImages(): string[] {
    return [...images];
  },

  getLatestImage(): string | null {
    return images.length ? images[images.length - 1] : null;
  },

  // Descarta sólo la última imagen capturada (p. ej. al borrar una foto)
  // sin perder el resto de la sesión.
  removeLatest() {
    images = images.slice(0, -1);
  },

  clear() {
    images = [];
  },
};

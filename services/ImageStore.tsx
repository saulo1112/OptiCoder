// services/ImageStore.ts

let imageBase64: string | null = null;

export const ImageStore = {
  setBase64(base64: string) {
    imageBase64 = base64;
  },
  getBase64() {
    return imageBase64;
  },
  clear() {
    imageBase64 = null;
  },
};

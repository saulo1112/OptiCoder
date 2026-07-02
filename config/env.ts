// Lee las variables de entorno EXPO_PUBLIC_* inyectadas por Expo en tiempo de build.
// Si falta alguna, lanza un error descriptivo en tiempo de ejecución para que el
// problema de configuración sea evidente de inmediato.

function requireEnvVar(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Falta la variable de entorno "${name}". ` +
        `Crea un archivo .env en la raíz del proyecto (usa .env.example como plantilla), ` +
        `define ${name} y reinicia el servidor de Expo.`
    );
  }
  return value.trim();
}

export const GEMINI_API_KEY = requireEnvVar(
  process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  "EXPO_PUBLIC_GEMINI_API_KEY"
);

export const OPENAI_API_KEY = requireEnvVar(
  process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  "EXPO_PUBLIC_OPENAI_API_KEY"
);

// Lee las variables de entorno EXPO_PUBLIC_* inyectadas por Expo en tiempo de build.
// Si falta alguna, lanza un error descriptivo en tiempo de ejecución para que el
// problema de configuración sea evidente de inmediato.

function requireEnvVar(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing environment variable "${name}". ` +
        `Create a .env file in the project root (use .env.example as a template), ` +
        `define ${name}, and restart the Expo server.`
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

// Sistema de tokens de diseño de OptiCoder.
// Fuente única de verdad visual: todo color, tamaño de fuente, espaciado y
// radio usado en los componentes debe referenciar este archivo.

export const Theme = {
  colors: {
    // Brand
    primary: "#0057A4", // Azul OptiCoder — acciones principales, mic activo
    primaryDark: "#023C69", // Estados presionados, status bar, UI profunda
    primaryLight: "#E8F1FB", // Fondos sutiles, estados seleccionados

    // Accent
    accent: "#00B4D8", // Elementos interactivos secundarios
    accentLight: "#E0F7FC", // Fondos de acento

    // Surfaces
    background: "#F4F7FC", // Fondo de la app — blanco roto con tinte azul
    surface: "#FFFFFF", // Tarjetas, burbujas, modales
    surfaceAlt: "#EAEEF8", // Fondo de burbuja de IA

    // Chat bubbles
    bubbleUser: "#D6EAFF", // Burbuja de mensaje del usuario
    bubbleAI: "#EAEEF8", // Burbuja de mensaje de la IA
    bubbleUserText: "#0D2B45", // Texto dentro de la burbuja del usuario
    bubbleAIText: "#1A1A2E", // Texto dentro de la burbuja de la IA

    // Text
    textPrimary: "#0D1B2A", // Texto principal
    textSecondary: "#4A5568", // Etiquetas, leyendas, pistas
    textOnPrimary: "#FFFFFF", // Texto sobre fondos de color primario
    textDisabled: "#A0AEC0", // Texto e iconos deshabilitados

    // Semantic
    error: "#D32F2F",
    errorLight: "#FFEBEE",
    success: "#2E7D32",
    successLight: "#E8F5E9",

    // UI
    border: "#DDE3EE",
    divider: "#EEF1F7",
    overlay: "rgba(2, 60, 105, 0.45)",
    shadow: "#0D1B2A",
  },

  typography: {
    // Tamaños de fuente
    xs: 11,
    sm: 13,
    base: 16,
    md: 18,
    lg: 22,
    xl: 26,
    xxl: 32,

    // Pesos de fuente (literales de string para StyleSheet)
    regular: "400" as const,
    medium: "500" as const,
    semiBold: "600" as const,
    bold: "700" as const,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 9999,
  },

  shadow: {
    sm: {
      shadowColor: "#0D1B2A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#0D1B2A",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 5,
    },
    lg: {
      shadowColor: "#0D1B2A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 10,
    },
  },
};

export default Theme;

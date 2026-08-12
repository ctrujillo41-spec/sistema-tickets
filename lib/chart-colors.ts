// Paleta fija para las gráficas (no cambia con el tema claro/oscuro):
// en visualización de datos conviene que el color de "prioridad alta"
// sea siempre el mismo rojo, se vea como se vea el resto de la pantalla.
//
// Vive en un archivo sin "use client" a propósito: si esta constante se
// exportara desde un componente cliente (como antes, desde donut-card.tsx),
// un Server Component que la importe recibe una referencia-proxy al módulo
// cliente en vez del objeto real. Indexarla (CHART_COLORS[tone]) hace que
// RSC intente serializar esa referencia como si fuera un componente y
// revienta con "Could not find the module ... in the React Client
// Manifest". Mantenerla en un módulo puramente de servidor/compartido evita
// el problema.
export const CHART_COLORS = {
  accent: "#3B63D9",
  success: "#1F9D6B",
  warning: "#E2960F",
  danger: "#DC3B3B",
  neutral: "#9AA1AE",
};

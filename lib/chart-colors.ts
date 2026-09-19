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

// Paleta multicolor para gráficas donde cada bloque/categoría necesita un
// tono distinto en vez de un significado semántico (ej. treemap por
// empresa) — inspirada en el dashboard ejecutivo de referencia de Christian.
export const TREEMAP_PALETTE = [
  "#2E75B6",
  "#EC1E63",
  "#F5A623",
  "#7B3F9E",
  "#1E8E4C",
  "#C9820A",
  "#5B9BD5",
  "#E67E22",
  "#9B59B6",
  "#16A085",
  "#D35400",
  "#8FC7E8",
];

// Colores fijos "de marca" para elementos que deben verse igual en claro y
// oscuro (el banner ejecutivo del dashboard), a diferencia del resto de la
// app que usa tokens de tema.
export const BRAND_NAVY = "#1F3864";
export const BRAND_NAVY_DARK = "#122447";
export const BRAND_BLUE = "#2E75B6";

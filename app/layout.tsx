import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Antes no había ninguna tipografía cargada: --font-sans nunca se definía,
// así que toda la app (incluido el menú lateral) caía al "system-ui" crudo
// del sistema operativo del usuario. Inter es una variable font pensada
// para pantalla, se auto-hospeda en build (sin llamadas externas en
// runtime) y cubre todos los pesos que ya usa la UI (medium, semibold, bold).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema de Tickets",
  description: "Help Desk interno — gestión de tickets de soporte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

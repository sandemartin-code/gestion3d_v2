import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Taller 3D — Gestión",
  description: "Clientes, materiales, productos y pedidos del emprendimiento",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Script anti-parpadeo: corre ANTES de que se pinte la página, así el tema
// oscuro no aparece después de un flash blanco. Si el usuario nunca eligió,
// se respeta la preferencia del sistema operativo.
const SCRIPT_TEMA = `
(function () {
  try {
    var t = localStorage.getItem("taller3d-tema");
    if (!t) {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
    }
    if (t === "oscuro") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="bg-base text-ink font-body antialiased">{children}</body>
    </html>
  );
}

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

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-base text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}

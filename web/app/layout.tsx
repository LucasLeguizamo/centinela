import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centinela · Alertas sísmicas por WhatsApp para Colombia",
  description:
    "Todo el mundo publica la magnitud del epicentro. Nadie te dice qué te tocó a ti. Centinela avisa por WhatsApp qué tan fuerte se sintió el sismo en tu municipio, y después te conecta con la ayuda.",
  openGraph: {
    title: "Centinela",
    description:
      "Qué tan fuerte se sintió el sismo donde estás tú, no la magnitud del epicentro. Por WhatsApp, sin instalar nada.",
    locale: "es_CO",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

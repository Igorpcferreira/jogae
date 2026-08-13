import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans } from "next/font/google";
import { Footer } from "@/components/shell/footer";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  /**
   * Base dos links absolutos do `<head>` (og:image, por exemplo). Sem isso o
   * Next monta o card do WhatsApp apontando pro host da requisição — que atrás
   * de proxy pode não ser o domínio real.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Jogaê — seu fut, sem enrolação",
    template: "%s · Jogaê",
  },
  description:
    "Organize o fut, monte times equilibrados, acompanhe o jogo e transforme a resenha em histórico — sem tirar a galera do WhatsApp.",
  applicationName: "Jogaê",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Jogaê",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#090A0C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full bg-canvas text-ink antialiased">
        {children}
        <Footer />
      </body>
    </html>
  );
}

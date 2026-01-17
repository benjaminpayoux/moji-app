import type { Metadata } from "next";
import { Fredoka, Quicksand } from "next/font/google";
import { ActiveGameRedirect } from "@/components/active-game-redirect";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: "700",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PlayMoji - Devine le film",
  description: "Devine le titre du film à partir des emojis",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤔</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${fredoka.variable} ${quicksand.variable} antialiased`}
      >
        <ActiveGameRedirect>{children}</ActiveGameRedirect>
      </body>
    </html>
  );
}

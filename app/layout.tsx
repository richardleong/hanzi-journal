import type { Metadata } from "next";
import { Noto_Serif_SC, Space_Mono, Lora } from "next/font/google";
import "./globals.css";

const notoSerifSC = Noto_Serif_SC({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

const lora = Lora({
  style: ['normal', 'italic'],
  subsets: ["latin"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "汉字 · Vocab Journal",
  description: "An aesthetic Chinese vocabulary journal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSerifSC.variable} ${spaceMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="w-full flex justify-center items-start min-h-screen">
        {children}
      </body>
    </html>
  );
}



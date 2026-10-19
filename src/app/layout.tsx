import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const description =
  "An AI support agent that answers from your help docs, links the source, says when it doesn't know, and hands off to a person.";

export const metadata: Metadata = {
  // Absolute URLs for the link-preview image; set APP_URL to the live address in production.
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3100"),
  title: "Sourced AI: support answers from your own docs",
  description,
  openGraph: {
    type: "website",
    siteName: "Sourced AI",
    title: "Sourced AI: support answers from your own docs",
    description,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

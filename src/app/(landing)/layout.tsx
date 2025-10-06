import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yourever - Work, chat, plan—one place",
  description: "The all-in-one workspace for teams to work, chat, and plan together. Scoped by Organization and Division.",
  keywords: ["Yourever", "workspace", "collaboration", "project management", "team chat", "planning"],
  authors: [{ name: "Yourever Team" }],
  openGraph: {
    title: "Yourever - Work, chat, plan—one place",
    description: "The all-in-one workspace for teams to work, chat, and plan together.",
    url: "https://yourever.com",
    siteName: "Yourever",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yourever - Work, chat, plan—one place",
    description: "The all-in-one workspace for teams to work, chat, and plan together.",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
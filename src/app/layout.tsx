import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyFlow - Study Smarter, Not Harder",
  description:
    "The beautiful, all-in-one study planner that helps you organize your learning, track your progress, and achieve your academic goals with style.",
  keywords: [
    "study planner",
    "student app",
    "productivity",
    "education",
    "learning",
    "study schedule",
    "academic planner",
  ],
  authors: [{ name: "StudyFlow" }],
  openGraph: {
    title: "StudyFlow - Study Smarter, Not Harder",
    description:
      "The beautiful, all-in-one study planner that helps you organize your learning, track your progress, and achieve your academic goals with style.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

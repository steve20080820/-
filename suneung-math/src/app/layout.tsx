import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { FontLoader } from "@/components/FontLoader";

export const metadata: Metadata = {
  title: "수능 수학 아카이브 & 시험지 빌더",
  description: "2028 수능 예시문항 스타일로 수학 문제를 조판·보관하고 나만의 시험지를 만듭니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <FontLoader />
        {children}
      </body>
    </html>
  );
}

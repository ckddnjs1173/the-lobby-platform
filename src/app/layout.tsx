import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Lobby - 프리미엄 커리어 플랫폼",
  description: "당신의 커리어를 한 단계 높여줄 엄선된 기회들",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#0f172a', // slate-900 (brand-navy)
              color: '#fff',
              fontSize: '14px',
              borderRadius: '999px',
              padding: '12px 24px',
            },
            success: {
              iconTheme: {
                primary: '#d4af37', // brand-gold
                secondary: '#0f172a',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Lobby | 더 로비",
  description: "내 커리어의 가장 완벽한 첫인상. 프리미엄 리셉션 & 대면 서비스 인재 매칭 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="text-2xl font-bold text-brand-navy tracking-tighter">THE LOBBY</Link>
              </div>
              <div className="hidden md:flex space-x-8">
                <Link href="/jobs" className="text-gray-600 hover:text-brand-gold transition-colors font-medium">채용공고</Link>
                <Link href="/b2b-admin" className="text-gray-600 hover:text-brand-gold transition-colors font-medium">인재풀 (B2B)</Link>
                <Link href="/register" className="text-gray-600 hover:text-brand-gold transition-colors font-medium">이력서 등록</Link>
              </div>
              <div>
                <Link href="/register" className="bg-brand-navy text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl">
                  시작하기
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-16">
          {children}
        </main>
        <footer className="bg-brand-navy text-white py-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
            <h2 className="text-xl font-bold text-white tracking-widest mb-4">THE LOBBY</h2>
            <p>© 2026 J&C Search Firm. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

import CandidateNavigationIntentTracker from "../components/candidate/CandidateNavigationIntentTracker";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "The Lobby | Premium Reception Career Studio",
  description: "리셉션·프론트·VIP 고객서비스 전문 채용과 커리어를 연결하는 The Lobby",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <CandidateNavigationIntentTracker />
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#24180f",
              color: "#fffdfa",
              fontSize: "13px",
              borderRadius: "10px",
              border: "1px solid rgba(152,100,47,0.24)",
              padding: "12px 18px",
              boxShadow: "0 14px 34px rgba(36,24,15,0.16)",
            },
            success: {
              iconTheme: {
                primary: "#98642f",
                secondary: "#fffdfa",
              },
            },
          }}
        />
      </body>
    </html>
  );
}

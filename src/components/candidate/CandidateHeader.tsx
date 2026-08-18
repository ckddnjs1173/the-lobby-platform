"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { auth } from "../../lib/firebase";
import { consumeCandidateReturnPath } from "../../lib/candidateNavigationIntent";

function LobbyMark() {
  return (
    <div className="relative h-11 w-9 shrink-0 text-brand-bronze" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-4px] text-[34px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[8px] text-[23px] leading-none text-brand-gold">L</span>
      <span className="absolute bottom-0 left-0 h-px w-8 bg-brand-gold/45" />
    </div>
  );
}

export default function CandidateHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthenticated(Boolean(user));
      setAuthReady(true);

      if (user && pathname === "/candidate") {
        const returnPath = consumeCandidateReturnPath();
        if (returnPath) router.replace(returnPath);
      }
    });
  }, [pathname, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
    router.refresh();
  };

  const navClass = (active: boolean) =>
    `relative py-2 text-[12px] font-semibold transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-brand-bronze after:transition-all ${
      active
        ? "text-brand-bronze after:w-full"
        : "text-brand-ink/75 after:w-0 hover:text-brand-bronze hover:after:w-full"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/80 bg-brand-light/94 backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="The Lobby 홈">
          <LobbyMark />
          <div className="leading-none">
            <div className="font-editorial text-[21px] tracking-[0.09em] text-brand-espresso transition group-hover:text-brand-bronze">
              THE LOBBY
            </div>
            <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.19em] text-brand-muted">
              Premium Reception Career Studio
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Candidate 메뉴">
          <Link href="/jobs" className={navClass(pathname.startsWith("/jobs"))}>
            추천 채용
          </Link>
          <Link href="/register" className={navClass(pathname === "/register")}>
            프로필 등록
          </Link>
          <Link href="/candidate" className={navClass(pathname === "/candidate")}>
            지원현황
          </Link>
          <Link href="/b2b-admin/login" className={navClass(false)}>
            기업서비스
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {authReady && authenticated ? (
            <>
              <Link
                href="/candidate"
                className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex"
              >
                마이페이지
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso"
              >
                로그아웃
              </button>
            </>
          ) : authReady ? (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso"
              >
                지원 시작 →
              </Link>
            </>
          ) : (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-brand-cream" />
          )}
        </div>
      </div>
    </header>
  );
}

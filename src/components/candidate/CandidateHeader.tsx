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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMobileOpen(false);
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

  const mobileItems = [
    { href: "/jobs", label: "추천 채용" },
    { href: "/register", label: "프로필 등록" },
    { href: "/candidate", label: "지원현황" },
    { href: "/b2b-admin/login", label: "기업서비스" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/80 bg-brand-light/94 backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="The Lobby 홈" onClick={() => setMobileOpen(false)}>
          <LobbyMark />
          <div className="leading-none">
            <div className="font-editorial text-[21px] tracking-[0.09em] text-brand-espresso transition group-hover:text-brand-bronze">THE LOBBY</div>
            <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.19em] text-brand-muted">Premium Reception Career Studio</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Candidate 메뉴">
          <Link href="/jobs" className={navClass(pathname.startsWith("/jobs"))}>추천 채용</Link>
          <Link href="/register" className={navClass(pathname === "/register")}>프로필 등록</Link>
          <Link href="/candidate" className={navClass(pathname === "/candidate")}>지원현황</Link>
          <Link href="/b2b-admin/login" className={navClass(false)}>기업서비스</Link>
        </nav>

        <div className="flex items-center gap-2">
          {authReady && authenticated ? (
            <>
              <Link href="/candidate" className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:bg-brand-ivory sm:inline-flex">마이페이지</Link>
              <button type="button" onClick={() => void handleSignOut()} className="hidden rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex">로그아웃</button>
            </>
          ) : authReady ? (
            <>
              <Link href="/login" className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:bg-brand-ivory sm:inline-flex">로그인</Link>
              <Link href="/register" className="hidden rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex">지원 시작 →</Link>
            </>
          ) : (
            <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-brand-cream sm:block" />
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-espresso lg:hidden"
          >
            <span className="text-lg leading-none" aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-brand-line bg-brand-light px-5 py-4 shadow-card lg:hidden sm:px-8">
          <nav className="mx-auto grid max-w-[1500px] gap-1" aria-label="Candidate 모바일 메뉴">
            {mobileItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-bold text-brand-espresso hover:bg-brand-ivory hover:text-brand-bronze">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-brand-line pt-3">
              {authReady && authenticated ? (
                <button type="button" onClick={() => void handleSignOut()} className="w-full rounded-lg bg-brand-bronze px-3 py-3 text-center text-xs font-bold text-white">로그아웃</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg border border-brand-line bg-white px-3 py-3 text-center text-xs font-bold text-brand-bronze">로그인</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-lg bg-brand-bronze px-3 py-3 text-center text-xs font-bold text-white">지원 시작</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

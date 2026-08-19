"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { auth } from "../../lib/firebase";
import { consumeCandidateReturnPath } from "../../lib/candidateNavigationIntent";

function LobbyMark() {
  return (
    <div className="relative h-10 w-9 shrink-0 text-brand-bronze" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-3px] text-[31px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[7px] text-[21px] leading-none text-brand-gold">L</span>
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
    `relative py-2.5 text-[13px] font-semibold transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-brand-bronze after:transition-all ${
      active
        ? "text-brand-bronze after:w-full"
        : "text-brand-ink/75 after:w-0 hover:text-brand-bronze hover:after:w-full"
    }`;

  const talentPoolHref = authenticated ? "/talent-pool/settings" : "/talent-pool";
  const mobileItems = [
    { href: "/jobs", label: "채용공고" },
    { href: talentPoolHref, label: authenticated ? "인재풀 설정" : "인재풀" },
    { href: "/candidate/saved-jobs", label: "관심공고" },
    { href: "/candidate", label: "지원현황" },
    { href: "/b2b-admin/login", label: "기업서비스" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/80 bg-brand-light/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-10 xl:px-12">
        <Link href="/" className="group flex items-center gap-3" aria-label="The Lobby 홈" onClick={() => setMobileOpen(false)}>
          <LobbyMark />
          <div className="leading-none">
            <div className="font-editorial text-[20px] font-bold tracking-[0.055em] text-brand-espresso transition group-hover:text-brand-bronze">
              THE LOBBY
            </div>
            <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-brand-muted sm:text-[8.5px]">
              Premium Reception Career Studio
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Candidate 메뉴">
          <Link href="/jobs" className={navClass(pathname.startsWith("/jobs"))}>채용공고</Link>
          <Link href={talentPoolHref} className={navClass(pathname.startsWith("/talent-pool"))}>{authenticated ? "인재풀 설정" : "인재풀"}</Link>
          <Link href="/candidate/saved-jobs" className={navClass(pathname.startsWith("/candidate/saved-jobs"))}>관심공고</Link>
          <Link href="/candidate" className={navClass(pathname === "/candidate")}>지원현황</Link>
          <Link href="/b2b-admin/login" className={navClass(false)}>기업서비스</Link>
        </nav>

        <div className="flex items-center gap-2.5">
          {authReady && authenticated ? (
            <>
              <Link href="/candidate" className="hidden min-h-10 items-center rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-bronze transition hover:bg-brand-ivory sm:inline-flex">마이페이지</Link>
              <button type="button" onClick={() => void handleSignOut()} className="hidden min-h-10 items-center rounded-lg bg-brand-bronze px-4 py-2.5 text-[13px] font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex">로그아웃</button>
            </>
          ) : authReady ? (
            <>
              <Link href="/login" className="hidden min-h-10 items-center rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-bronze transition hover:bg-brand-ivory sm:inline-flex">로그인</Link>
              <Link href="/talent-pool" className="hidden min-h-10 items-center rounded-lg bg-brand-bronze px-4 py-2.5 text-[13px] font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex">인재풀 등록 →</Link>
            </>
          ) : (
            <div className="hidden h-10 w-24 animate-pulse rounded-lg bg-brand-cream sm:block" />
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
        <div className="border-t border-brand-line bg-brand-light px-6 py-4 shadow-card lg:hidden sm:px-8">
          <nav className="mx-auto grid max-w-[1440px] gap-1" aria-label="Candidate 모바일 메뉴">
            {mobileItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-[14px] font-semibold text-brand-espresso hover:bg-brand-ivory hover:text-brand-bronze">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-brand-line pt-3">
              {authReady && authenticated ? (
                <button type="button" onClick={() => void handleSignOut()} className="w-full rounded-lg bg-brand-bronze px-3 py-3 text-center text-[13px] font-semibold text-white">로그아웃</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg border border-brand-line bg-white px-3 py-3 text-center text-[13px] font-semibold text-brand-bronze">로그인</Link>
                  <Link href="/talent-pool" onClick={() => setMobileOpen(false)} className="rounded-lg bg-brand-bronze px-3 py-3 text-center text-[13px] font-semibold text-white">인재풀 등록</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

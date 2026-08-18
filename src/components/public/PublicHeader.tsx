"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "추천 채용" },
  { href: "/register", label: "프로필 등록" },
  { href: "/candidate", label: "지원현황" },
  { href: "/b2b-admin/login", label: "기업서비스" },
] as const;

function LobbyMark() {
  return (
    <div className="relative h-11 w-9 shrink-0 text-brand-bronze" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-4px] text-[34px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[8px] text-[23px] leading-none text-brand-gold">L</span>
      <span className="absolute bottom-0 left-0 h-px w-8 bg-brand-gold/45" />
    </div>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-line/80 bg-brand-light/94 backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="The Lobby 홈" onClick={() => setMobileOpen(false)}>
          <LobbyMark />
          <div className="leading-none">
            <div className="font-editorial text-[21px] tracking-[0.09em] text-brand-espresso transition group-hover:text-brand-bronze">THE LOBBY</div>
            <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.19em] text-brand-muted">Premium Reception Career Studio</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 xl:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`relative py-2 text-[12px] font-semibold transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-brand-bronze after:transition-all ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "text-brand-bronze after:w-full"
                  : "text-brand-ink/80 after:w-0 hover:text-brand-bronze hover:after:w-full"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex">로그인</Link>
          <Link href="/register" className="hidden items-center gap-2 rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex">
            지원 시작 <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-espresso xl:hidden"
          >
            <span className="text-lg leading-none" aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-brand-line bg-brand-light px-5 py-4 shadow-card xl:hidden sm:px-8">
          <nav className="mx-auto grid max-w-[1500px] gap-1" aria-label="모바일 주요 메뉴">
            {NAV_ITEMS.map((item) => (
              <Link
                key={`mobile-${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-bold text-brand-espresso hover:bg-brand-ivory hover:text-brand-bronze"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-brand-line pt-3">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg border border-brand-line bg-white px-3 py-3 text-center text-xs font-bold text-brand-bronze">로그인</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-lg bg-brand-bronze px-3 py-3 text-center text-xs font-bold text-white">지원 시작</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

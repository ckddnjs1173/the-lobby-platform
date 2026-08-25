"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "채용공고" },
  { href: "/careers", label: "커리어 가이드" },
  { href: "/talent-pool", label: "인재풀" },
  { href: "/candidate", label: "지원현황" },
  { href: "/b2b-admin/login", label: "기업 로그인" },
] as const;

function LobbyMark() {
  return (
    <div className="relative h-10 w-9 shrink-0 text-brand-bronze" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-3px] text-[31px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[7px] text-[21px] leading-none text-brand-gold">L</span>
      <span className="absolute bottom-0 left-0 h-px w-8 bg-brand-gold/45" />
    </div>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-line/80 bg-brand-light/95 backdrop-blur-xl">
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

        <nav className="hidden items-center gap-6 xl:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`relative py-2.5 text-[13px] font-semibold transition after:absolute after:bottom-0 after:left-0 after:h-px after:bg-brand-bronze after:transition-all ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "text-brand-bronze after:w-full"
                  : "text-brand-ink/80 after:w-0 hover:text-brand-bronze hover:after:w-full"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex"
          >
            로그인
          </Link>
          <Link
            href="/talent-pool/register"
            className="hidden min-h-10 items-center gap-2 rounded-lg bg-brand-bronze px-4.5 py-2.5 text-[13px] font-semibold text-white shadow-card transition hover:bg-brand-espresso sm:inline-flex"
          >
            인재풀 등록 <span aria-hidden="true">→</span>
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
        <div className="border-t border-brand-line bg-brand-light px-6 py-4 shadow-card xl:hidden sm:px-8">
          <nav className="mx-auto grid max-w-[1440px] gap-1" aria-label="모바일 주요 메뉴">
            {NAV_ITEMS.map((item) => (
              <Link
                key={`mobile-${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-[14px] font-semibold text-brand-espresso hover:bg-brand-ivory hover:text-brand-bronze"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-brand-line pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-brand-line bg-white px-3 py-3 text-center text-[13px] font-semibold text-brand-bronze"
              >
                로그인
              </Link>
              <Link
                href="/talent-pool/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-brand-bronze px-3 py-3 text-center text-[13px] font-semibold text-white"
              >
                인재풀 등록
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

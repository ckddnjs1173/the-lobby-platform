import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "회사소개" },
  { href: "/jobs", label: "직무 카테고리" },
  { href: "/jobs", label: "추천 채용" },
  { href: "/register", label: "프로필 등록" },
  { href: "/candidate", label: "지원현황" },
] as const;

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-line/80 bg-brand-light/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="The Lobby 홈">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-gold/35 bg-white font-editorial text-2xl text-brand-bronze shadow-sm transition group-hover:border-brand-gold/60">
            L
          </div>
          <div className="leading-none">
            <div className="font-editorial text-[22px] tracking-[0.16em] text-brand-espresso">
              THE LOBBY
            </div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Premium Reception Career Studio
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="text-[13px] font-semibold text-brand-ink/80 transition hover:text-brand-bronze"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-xl border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso"
          >
            지원 시작
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "회사소개" },
  { href: "/jobs", label: "직무 카테고리" },
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
  return (
    <header className="sticky top-0 z-50 border-b border-brand-line/80 bg-brand-light/94 backdrop-blur-xl">
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

        <nav className="hidden items-center gap-7 xl:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="relative py-2 text-[12px] font-semibold text-brand-ink/80 transition after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-brand-bronze after:transition-all hover:text-brand-bronze hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg border border-brand-gold/35 bg-white px-4 py-2.5 text-xs font-semibold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory sm:inline-flex"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-espresso"
          >
            지원 시작
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

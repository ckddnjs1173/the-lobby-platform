import Link from "next/link";

import PublicHeader from "../components/public/PublicHeader";

const ROLE_CATEGORIES = [
  ["기업 리셉션", "Corporate Reception"],
  ["병원 · 클리닉", "Clinic / Hospital"],
  ["호텔 프론트", "Hotel Front"],
  ["전시장 · 쇼룸", "Showroom"],
  ["서비스 데스크", "Service Desk"],
  ["VIP 라운지", "VIP Lounge"],
] as const;

const FEATURED_ROLES = [
  {
    eyebrow: "CORPORATE",
    title: "기업 리셉션",
    description: "브랜드의 첫인상을 만드는 오피스·본사 안내데스크 포지션",
  },
  {
    eyebrow: "HOSPITALITY",
    title: "호텔 프론트",
    description: "고객 경험과 서비스 역량을 깊게 쌓는 프리미엄 호텔 포지션",
  },
  {
    eyebrow: "VIP SERVICE",
    title: "VIP 라운지",
    description: "세심한 응대와 커뮤니케이션이 중요한 고급 서비스 포지션",
  },
  {
    eyebrow: "SHOWROOM",
    title: "전시장 · 쇼룸",
    description: "자동차·리테일 브랜드의 공간 경험을 완성하는 고객 응대 포지션",
  },
] as const;

const VALUE_PROPS = [
  {
    title: "직무 전문성",
    description: "리셉션·프론트·VIP 응대 직무에 집중해 커리어 맥락까지 함께 봅니다.",
  },
  {
    title: "검증된 Candidate Pool",
    description: "프로필과 지원 이력을 바탕으로 후보자와 포지션을 더 정교하게 연결합니다.",
  },
  {
    title: "채용 전 과정 연결",
    description: "지원부터 면접, 합격과 입사까지 하나의 흐름으로 관리합니다.",
  },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-light text-brand-ink">
      <PublicHeader />

      <section className="border-b border-brand-line/80">
        <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex min-h-[620px] flex-col justify-center px-6 py-16 sm:px-10 lg:px-12 xl:px-16">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-bronze">
              Premium Reception Career Studio
            </p>

            <h1 className="font-editorial max-w-[760px] text-[48px] leading-[1.13] text-brand-espresso sm:text-[60px] lg:text-[68px] xl:text-[76px]">
              리셉션 · 고객서비스
              <br />
              커리어의 시작
            </h1>

            <p className="mt-7 max-w-[650px] text-[15px] leading-7 text-brand-muted sm:text-base">
              기업 리셉션, 호텔 프론트, VIP 라운지, 병원·클리닉까지.
              <br className="hidden sm:block" />
              고객과 브랜드를 잇는 커리어를 The Lobby에서 발견하세요.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-3 rounded-xl bg-brand-bronze px-6 py-3.5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-espresso"
              >
                채용공고 보기
                <ArrowIcon />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 rounded-xl border border-brand-gold/35 bg-white px-6 py-3.5 text-sm font-bold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory"
              >
                간편 프로필 등록
              </Link>
            </div>

            <div className="mt-12 grid max-w-[650px] grid-cols-1 gap-4 border-t border-brand-line/80 pt-7 sm:grid-cols-3">
              {[
                ["전문 직무", "리셉션 · 프론트 중심"],
                ["맞춤 연결", "프로필 기반 추천"],
                ["진행 관리", "지원부터 입사까지"],
              ].map(([title, description]) => (
                <div key={title}>
                  <p className="text-sm font-bold text-brand-espresso">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden border-t border-brand-line/80 lg:min-h-[620px] lg:border-l lg:border-t-0">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(36,24,15,0.12), rgba(36,24,15,0.02)), url('https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=88')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/30 via-transparent to-white/5" />

            <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/35 bg-brand-espresso/65 p-5 text-white shadow-soft backdrop-blur-md sm:left-auto sm:w-[330px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-cream">
                The Lobby Standard
              </p>
              <p className="font-editorial mt-3 text-2xl leading-tight">
                좋은 커리어는
                <br />
                좋은 첫 경험에서 시작됩니다.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-white/75">
                <span className="h-px w-8 bg-brand-cream/60" />
                Reception · Hospitality · Customer Service
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto -mt-7 max-w-[1320px] px-5 pb-8 sm:px-8 lg:-mt-8">
          <Link
            href="/jobs"
            className="lobby-glass relative z-10 grid overflow-hidden rounded-2xl border border-brand-line shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_72px]"
          >
            {[
              ["지역", "전체 지역"],
              ["직무", "전체 직무"],
              ["경력", "전체 경력"],
              ["근무형태", "전체 형태"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-brand-line px-5 py-4 last:border-b-0 sm:border-r lg:border-b-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-brand-espresso">{value}</p>
              </div>
            ))}
            <div className="flex items-center justify-center bg-brand-bronze p-5 text-white">
              <SearchIcon />
            </div>
          </Link>
        </div>
      </section>

      <section className="border-b border-brand-line/80 bg-white/55">
        <div className="mx-auto max-w-[1480px] px-5 py-5 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {ROLE_CATEGORIES.map(([title, subtitle]) => (
              <Link
                key={title}
                href="/jobs"
                className="group rounded-xl border border-brand-line bg-white px-4 py-4 transition hover:border-brand-gold/45 hover:shadow-card"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-ivory text-brand-bronze">
                  <span className="text-sm">◇</span>
                </div>
                <p className="text-sm font-bold text-brand-espresso">{title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-brand-muted">{subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brand-bronze">Career Curation</p>
            <h2 className="font-editorial mt-3 text-4xl text-brand-espresso sm:text-5xl">대표 직무 큐레이션</h2>
            <p className="mt-3 text-sm leading-6 text-brand-muted">현재 채용 공고는 실시간 목록에서 확인할 수 있습니다.</p>
          </div>
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-brand-bronze transition hover:text-brand-espresso">
            전체 채용 보기
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURED_ROLES.map((role, index) => (
            <Link
              key={role.title}
              href="/jobs"
              className="group overflow-hidden rounded-2xl border border-brand-line bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className={`relative h-52 overflow-hidden ${index % 2 === 0 ? "bg-gradient-to-br from-[#b89a7d] via-[#7c5b42] to-[#35251a]" : "bg-gradient-to-br from-[#e2d2bf] via-[#9f7858] to-[#4b3424]"}`}>
                <div className="lobby-grid absolute inset-0 opacity-30" />
                <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/20 bg-black/15 p-4 text-white backdrop-blur-sm">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/65">{role.eyebrow}</p>
                  <p className="font-editorial mt-1 text-2xl">{role.title}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="min-h-[48px] text-sm leading-6 text-brand-muted">{role.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-brand-line pt-4 text-xs font-bold text-brand-bronze">
                  포지션 살펴보기
                  <ArrowIcon />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-brand-line/80 bg-brand-ivory/70">
        <div className="mx-auto grid max-w-[1480px] gap-4 px-5 py-10 sm:px-8 lg:grid-cols-[1.6fr_0.8fr] lg:px-10">
          <div className="grid gap-0 overflow-hidden rounded-2xl border border-brand-line bg-white md:grid-cols-3">
            {VALUE_PROPS.map((item, index) => (
              <div key={item.title} className={`p-7 ${index < VALUE_PROPS.length - 1 ? "border-b border-brand-line md:border-b-0 md:border-r" : ""}`}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-light text-brand-bronze">
                  <span className="font-editorial text-xl">0{index + 1}</span>
                </div>
                <h3 className="text-base font-bold text-brand-espresso">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-muted">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-brand-espresso p-8 text-white shadow-card">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border border-brand-gold/20" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-brand-gold/15" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-cream/70">For Companies</p>
            <h3 className="font-editorial mt-4 text-3xl">기업 채용 서비스</h3>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              리셉션·고객서비스 인재 채용을 후보자 발굴부터 면접, 입사까지 체계적으로 운영합니다.
            </p>
            <Link href="/b2b-admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-brand-gold/45 px-5 py-3 text-xs font-bold text-brand-cream transition hover:bg-white/10">
              기업 서비스 보기
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-8 text-xs text-brand-muted sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div>
          <span className="font-editorial text-lg tracking-[0.12em] text-brand-espresso">THE LOBBY</span>
          <span className="ml-3">Premium Reception Career Studio</span>
        </div>
        <div>© 2026 The Lobby by J&amp;C.</div>
      </footer>
    </main>
  );
}

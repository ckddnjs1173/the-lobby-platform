import Link from "next/link";

import FeaturedJobs from "../components/public/FeaturedJobs";
import PublicHeader from "../components/public/PublicHeader";

const ROLE_CATEGORIES = [
  ["기업 리셉션", "Corporate Reception", "/jobs?category=corporate"],
  ["병원 · 클리닉", "Clinic / Hospital", "/jobs?category=clinic"],
  ["호텔 프론트", "Hotel Front", "/jobs?category=hotel"],
  ["전시장 · 쇼룸", "Showroom", "/jobs?category=showroom"],
  ["서비스 데스크", "Service Desk", "/jobs?q=서비스"],
  ["VIP 라운지", "VIP Lounge", "/jobs?category=lounge"],
] as const;

const VALUE_PROPS = [
  {
    title: "직무 전문성",
    description: "리셉션·프론트·VIP 응대 직무에 집중해 경험과 커리어 맥락까지 함께 봅니다.",
  },
  {
    title: "검증된 Candidate Pool",
    description: "프로필과 지원 이력을 바탕으로 후보자와 포지션을 더 정교하게 연결합니다.",
  },
  {
    title: "채용 전 과정 연결",
    description: "지원부터 면접, 합격과 입사까지 하나의 흐름으로 관리하고 안내합니다.",
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
    <main className="public-shell min-h-screen overflow-x-hidden bg-brand-light text-brand-ink">
      <PublicHeader />

      <section className="border-b border-brand-line/80">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative flex min-h-[520px] flex-col justify-center px-6 py-14 sm:min-h-[560px] sm:px-10 sm:py-16 lg:min-h-[590px] lg:px-14 xl:min-h-[610px] xl:px-16">
            <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand-bronze">
              <span className="h-px w-8 bg-brand-gold/45" />
              Premium Reception Career Studio
            </p>

            <h1 className="font-editorial break-keep text-[42px] font-bold leading-[1.18] tracking-[-0.04em] text-brand-espresso sm:text-[48px] lg:text-[50px] xl:text-[54px]">
              <span className="block lg:whitespace-nowrap">리셉션·고객서비스</span>
              <span className="mt-1 block">커리어의 시작</span>
            </h1>

            <p className="mt-6 max-w-[590px] break-keep text-[15px] leading-7 text-brand-muted sm:text-[16px]">
              기업 리셉션, 호텔 프론트, VIP 라운지, 병원·클리닉까지.
              <br className="hidden sm:block" />
              고객과 브랜드를 잇는 서비스 커리어를 The Lobby에서 발견하세요.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex min-h-[50px] items-center gap-3 rounded-lg bg-brand-bronze px-6 py-3 text-[14px] font-bold text-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:bg-brand-espresso"
              >
                채용공고 보기
                <ArrowIcon />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-[50px] items-center gap-3 rounded-lg border border-brand-gold/35 bg-white px-6 py-3 text-[14px] font-bold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory"
              >
                간편 프로필 등록
              </Link>
            </div>

            <div className="mt-10 grid max-w-[610px] grid-cols-3 border-t border-brand-line pt-6">
              {[
                ["전문 직무", "리셉션·프론트 중심"],
                ["맞춤 연결", "프로필 기반 추천"],
                ["진행 관리", "지원부터 입사까지"],
              ].map(([title, description], index) => (
                <div key={title} className={index > 0 ? "border-l border-brand-line pl-4 sm:pl-6" : "pr-4"}>
                  <p className="text-[13px] font-bold text-brand-espresso">{title}</p>
                  <p className="mt-1 hidden text-[12px] leading-5 text-brand-muted sm:block">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[460px] overflow-hidden border-t border-brand-line sm:min-h-[520px] lg:min-h-[590px] lg:border-l lg:border-t-0 xl:min-h-[610px]">
            <div
              className="absolute inset-0 scale-[1.01] bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(36,24,15,0.08), rgba(36,24,15,0.00) 45%), url('https://images.unsplash.com/photo-1775447665921-87fb172bf115?auto=format&fit=crop&w=1800&q=90')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/30 via-transparent to-white/5" />

            <div className="absolute left-5 top-5 flex items-center gap-3 rounded-xl border border-white/45 bg-white/92 p-3.5 shadow-card backdrop-blur sm:left-7 sm:top-7">
              <div
                className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=85')",
                }}
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-bronze">Career Support</p>
                <p className="mt-1 text-[13px] font-bold text-brand-espresso">전문 리크루터가 함께합니다</p>
              </div>
            </div>

            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/30 bg-brand-espresso/82 p-5 text-white shadow-soft backdrop-blur-md sm:bottom-7 sm:left-auto sm:right-7 sm:w-[330px] sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-cream/80">
                The Lobby Standard
              </p>
              <p className="font-editorial mt-3 break-keep text-[23px] font-bold leading-[1.4] tracking-[-0.025em]">
                좋은 커리어는 좋은 첫 경험에서 시작됩니다.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-white/70">
                <span className="h-px w-8 bg-brand-cream/55" />
                Reception · Hospitality · Customer Service
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-brand-line/80 bg-brand-light">
        <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 lg:px-10">
          <form
            action="/jobs"
            method="get"
            className="lobby-glass grid overflow-hidden rounded-xl border border-brand-line shadow-soft sm:grid-cols-2 lg:grid-cols-[1.3fr_0.82fr_0.82fr_0.82fr_76px]"
          >
            <label className="flex min-h-[72px] items-center gap-3 border-b border-brand-line px-5 py-4 sm:border-r lg:border-b-0">
              <span className="text-brand-bronze"><SearchIcon /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold tracking-[0.08em] text-brand-muted">키워드</span>
                <input
                  name="q"
                  placeholder="직무, 회사, 지역"
                  className="mt-1 w-full bg-transparent text-[14px] font-semibold text-brand-espresso outline-none placeholder:font-normal placeholder:text-brand-muted/65"
                />
              </span>
            </label>

            <label className="border-b border-brand-line px-5 py-3.5 sm:border-r lg:border-b-0">
              <span className="block text-[10px] font-bold tracking-[0.08em] text-brand-muted">지역</span>
              <select name="location" defaultValue="" className="mt-1.5 w-full bg-transparent text-[14px] font-semibold text-brand-espresso outline-none">
                <option value="">전체 지역</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="부산">부산</option>
                <option value="제주">제주</option>
              </select>
            </label>

            <label className="border-b border-brand-line px-5 py-3.5 sm:border-r lg:border-b-0">
              <span className="block text-[10px] font-bold tracking-[0.08em] text-brand-muted">직무</span>
              <select name="category" defaultValue="" className="mt-1.5 w-full bg-transparent text-[14px] font-semibold text-brand-espresso outline-none">
                <option value="">전체 직무</option>
                <option value="corporate">기업 리셉션</option>
                <option value="clinic">병원 · 클리닉</option>
                <option value="hotel">호텔 프론트</option>
                <option value="showroom">전시장 · 쇼룸</option>
                <option value="lounge">VIP 라운지</option>
              </select>
            </label>

            <label className="px-5 py-3.5 sm:border-r">
              <span className="block text-[10px] font-bold tracking-[0.08em] text-brand-muted">근무형태</span>
              <select name="employment" defaultValue="" className="mt-1.5 w-full bg-transparent text-[14px] font-semibold text-brand-espresso outline-none">
                <option value="">전체 형태</option>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="파견계약직">파견계약직</option>
                <option value="인턴">인턴</option>
              </select>
            </label>

            <button type="submit" aria-label="채용공고 검색" className="flex min-h-[72px] items-center justify-center bg-brand-bronze text-white transition hover:bg-brand-espresso">
              <SearchIcon />
            </button>
          </form>
        </div>
      </section>

      <section className="border-b border-brand-line/80 bg-white/60">
        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10 xl:px-12">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            {ROLE_CATEGORIES.map(([title, subtitle, href], index) => (
              <Link
                key={title}
                href={href}
                className="group flex min-h-[68px] items-center gap-3 rounded-lg border border-brand-line bg-white px-4 py-3.5 transition hover:border-brand-gold/45 hover:shadow-card"
              >
                <div className="font-editorial flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-gold/25 bg-brand-ivory text-[14px] font-bold text-brand-bronze transition group-hover:bg-brand-bronze group-hover:text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-brand-espresso">{title}</p>
                  <p className="mt-0.5 hidden truncate text-[9.5px] uppercase tracking-[0.06em] text-brand-muted sm:block">{subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-12">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Recommended Jobs</p>
            <h2 className="font-editorial mt-3 text-[36px] font-bold leading-tight tracking-[-0.03em] text-brand-espresso sm:text-[42px]">지금 추천하는 채용</h2>
            <p className="mt-3 text-[14px] leading-6 text-brand-muted">현재 OPEN 상태의 최신 포지션을 바로 확인하세요.</p>
          </div>
          <Link href="/jobs" className="inline-flex items-center gap-2 text-[14px] font-bold text-brand-bronze transition hover:text-brand-espresso">
            전체 채용 보기
            <ArrowIcon />
          </Link>
        </div>

        <FeaturedJobs />
      </section>

      <section className="border-y border-brand-line/80 bg-brand-ivory/65">
        <div className="mx-auto grid max-w-[1440px] gap-4 px-5 py-10 sm:px-8 lg:grid-cols-[1.6fr_0.8fr] lg:px-10 xl:px-12">
          <div className="grid overflow-hidden rounded-xl border border-brand-line bg-white md:grid-cols-3">
            {VALUE_PROPS.map((item, index) => (
              <div key={item.title} className={`p-7 ${index < VALUE_PROPS.length - 1 ? "border-b border-brand-line md:border-b-0 md:border-r" : ""}`}>
                <div className="font-editorial mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-light text-lg font-bold text-brand-bronze">
                  0{index + 1}
                </div>
                <h3 className="text-[15px] font-bold text-brand-espresso">{item.title}</h3>
                <p className="mt-2 break-keep text-[13px] leading-6 text-brand-muted">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-xl bg-brand-espresso p-8 text-white shadow-card">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border border-brand-gold/20" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-brand-gold/15" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-cream/70">For Companies</p>
            <h3 className="font-editorial mt-4 text-[30px] font-bold tracking-[-0.025em]">기업 채용 서비스</h3>
            <p className="mt-4 max-w-sm break-keep text-[13px] leading-6 text-white/70">
              리셉션·고객서비스 인재 채용을 후보자 발굴부터 면접, 입사까지 체계적으로 운영합니다.
            </p>
            <Link href="/b2b-admin/login" className="mt-8 inline-flex items-center gap-2 rounded-lg border border-brand-gold/45 px-5 py-3 text-[13px] font-bold text-brand-cream transition hover:bg-white/10">
              기업 서비스 보기
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 xl:px-12">
        <div className="grid gap-4 rounded-xl border border-brand-line bg-white px-6 py-6 md:grid-cols-3 md:px-8">
          {[
            ["엄선된 전문 포지션", "리셉션·고객서비스 직무에 집중합니다."],
            ["지원자 보호", "지원 정보와 내부 채용 데이터의 경계를 지킵니다."],
            ["커리어 연결", "지원 이후의 과정까지 계속 이어집니다."],
          ].map(([title, description]) => (
            <div key={title} className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-bronze" />
              <div>
                <p className="text-[14px] font-bold text-brand-espresso">{title}</p>
                <p className="mt-1 text-[13px] leading-5 text-brand-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-brand-line/80">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-[13px] text-brand-muted sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10 xl:px-12">
          <div>
            <span className="font-editorial text-lg font-bold tracking-[0.08em] text-brand-espresso">THE LOBBY</span>
            <span className="ml-3">Premium Reception Career Studio</span>
          </div>
          <div>© 2026 The Lobby by J&C.</div>
        </div>
      </footer>
    </main>
  );
}

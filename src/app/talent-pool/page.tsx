import Link from "next/link";

import PublicHeader from "../../components/public/PublicHeader";

const ROLE_TRACKS = [
  {
    title: "기업 리셉션",
    description: "오피스·본사·비즈니스센터의 방문객 안내와 고객 응대 포지션",
  },
  {
    title: "전시장 · 서비스센터",
    description: "자동차·브랜드 쇼룸과 서비스센터의 안내·접수·예약 관리 포지션",
  },
  {
    title: "호텔 · VIP 서비스",
    description: "호텔 프론트, 라운지, 컨시어지와 VIP 고객 응대 포지션",
  },
  {
    title: "병원 · 클리닉",
    description: "접수·예약·내원 고객 안내 중심의 메디컬 서비스 포지션",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "프로필을 먼저 등록합니다",
    description: "이력서 파일을 AI로 구조화하거나 직접 입력해 경력·학력·핵심 스킬을 한 번 정리합니다.",
  },
  {
    number: "02",
    title: "희망조건과 공개 범위를 정합니다",
    description: "희망 직무·지역·급여·입사 가능일을 입력하고 J&C 인재풀 공개 여부를 직접 선택합니다.",
  },
  {
    number: "03",
    title: "공고와 채용 제안을 이어서 봅니다",
    description: "관심공고를 저장하고 J&C의 포지션 제안은 직접 수락한 뒤에만 실제 지원으로 진행합니다.",
  },
] as const;

const FAQ = [
  [
    "지원할 공고가 없어도 등록할 수 있나요?",
    "네. The Lobby의 Candidate 프로필은 특정 공고에 종속되지 않습니다. 먼저 프로필을 만들고 희망조건과 인재풀 공개 여부를 설정할 수 있습니다.",
  ],
  [
    "인재풀에 등록하면 기업에 바로 공개되나요?",
    "아닙니다. 공개에 동의한 프로필은 J&C ADMIN의 인재풀 검토 대상으로만 표시되며 기업별 리쿠르터에게 자동 공개되지 않습니다.",
  ],
  [
    "J&C가 포지션을 제안하면 바로 지원 처리되나요?",
    "아닙니다. 받은 채용 제안에서 후보자가 직접 수락해야 해당 포지션의 실제 지원 내역이 생성됩니다.",
  ],
  [
    "등록한 내용과 공개 여부는 나중에 바꿀 수 있나요?",
    "네. Candidate Portal과 인재풀 설정에서 프로필, 희망조건, 인재풀 공개 여부를 다시 수정할 수 있습니다.",
  ],
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TalentPoolPage() {
  return (
    <main className="min-h-screen bg-brand-light text-brand-ink">
      <PublicHeader />

      <section className="border-b border-brand-line/80 bg-white/35">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-24 xl:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">The Lobby Talent Pool</p>
            <h1 className="font-editorial mt-4 max-w-[820px] break-keep text-[42px] font-bold leading-[1.18] tracking-[-0.045em] text-brand-espresso sm:text-[52px] lg:text-[58px]">
              공고가 없어도,
              <span className="block">먼저 연결될 준비를 하세요.</span>
            </h1>
            <p className="mt-6 max-w-[700px] break-keep text-[15px] leading-7 text-brand-muted sm:text-[16px]">
              리셉션·프론트·고객서비스 직무를 계속 보고 있다면, 매번 이력서를 새로 정리할 필요가 없습니다.
              The Lobby에 커리어 프로필을 만들고 희망조건과 공개 범위를 직접 설정하세요.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/talent-pool/register"
                className="inline-flex min-h-[50px] items-center gap-3 rounded-lg bg-brand-bronze px-6 py-3 text-[14px] font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-espresso"
              >
                인재풀 프로필 등록
                <ArrowIcon />
              </Link>
              <Link
                href="/jobs"
                className="inline-flex min-h-[50px] items-center gap-3 rounded-lg border border-brand-gold/35 bg-white px-6 py-3 text-[14px] font-bold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory"
              >
                현재 채용공고 보기
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 border-t border-brand-line pt-5 text-[12px] text-brand-muted">
              <span>공고 없이 등록 가능</span>
              <span>AI 이력서 구조화</span>
              <span>공개 여부 직접 선택</span>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-2xl bg-brand-espresso p-7 text-white shadow-soft sm:p-9">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-brand-gold/20" />
            <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full border border-brand-gold/15" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-cream/65">Why register first?</p>
            <h2 className="font-editorial mt-5 break-keep text-[30px] font-bold leading-[1.35] tracking-[-0.035em] sm:text-[34px]">
              지금 당장 맞는 공고가 없어도 커리어 준비는 이어질 수 있습니다.
            </h2>
            <div className="mt-8 grid gap-5 border-t border-white/15 pt-6 text-[13px] leading-6 text-white/70">
              <div>
                <p className="font-bold text-brand-cream">희망조건까지 한 번에</p>
                <p className="mt-1">프로필과 함께 희망 직무·지역·급여·입사 가능일을 관리합니다.</p>
              </div>
              <div>
                <p className="font-bold text-brand-cream">공개 범위는 직접 선택</p>
                <p className="mt-1">J&C 공개 인재풀 참여 여부는 가입과 별도로 켜고 끌 수 있습니다.</p>
              </div>
              <div>
                <p className="font-bold text-brand-cream">지원 결정도 후보자가</p>
                <p className="mt-1">포지션 제안을 받아도 직접 수락하기 전에는 실제 지원으로 처리되지 않습니다.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-12">
        <div className="max-w-[760px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Career Tracks</p>
          <h2 className="font-editorial mt-3 text-[34px] font-bold tracking-[-0.035em] text-brand-espresso sm:text-[40px]">이런 커리어를 보고 있다면</h2>
          <p className="mt-3 text-[14px] leading-6 text-brand-muted">현재 공개 공고 수와 관계없이 아래 직무군의 커리어 프로필과 희망조건을 먼저 정리해둘 수 있습니다.</p>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-xl border border-brand-line bg-white md:grid-cols-2 xl:grid-cols-4">
          {ROLE_TRACKS.map((role, index) => (
            <div key={role.title} className={`p-6 sm:p-7 ${index < ROLE_TRACKS.length - 1 ? "border-b border-brand-line md:border-b-0 md:border-r" : ""}`}>
              <p className="font-editorial text-[15px] font-bold text-brand-bronze">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 text-[15px] font-bold text-brand-espresso">{role.title}</h3>
              <p className="mt-2 break-keep text-[12px] leading-6 text-brand-muted">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-brand-line/80 bg-brand-ivory/65">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 xl:px-12">
          <div className="grid gap-4 lg:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="rounded-xl border border-brand-line bg-white p-7 shadow-card">
                <p className="font-editorial text-[18px] font-bold text-brand-bronze">{step.number}</p>
                <h3 className="mt-5 text-[16px] font-bold text-brand-espresso">{step.title}</h3>
                <p className="mt-3 break-keep text-[13px] leading-6 text-brand-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Before you register</p>
          <h2 className="font-editorial mt-3 break-keep text-[34px] font-bold tracking-[-0.035em] text-brand-espresso">먼저 궁금한 점</h2>
          <p className="mt-4 break-keep text-[13px] leading-6 text-brand-muted">프로필은 특정 공고 지원서가 아니라 Candidate 계정에 연결되는 커리어 정보이며, J&C 인재풀 공개는 별도 선택사항입니다.</p>
        </div>
        <div className="divide-y divide-brand-line rounded-xl border border-brand-line bg-white px-6 shadow-card sm:px-8">
          {FAQ.map(([question, answer]) => (
            <div key={question} className="py-6">
              <h3 className="text-[14px] font-bold text-brand-espresso">{question}</h3>
              <p className="mt-2 break-keep text-[13px] leading-6 text-brand-muted">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-brand-line bg-brand-espresso text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-cream/60">Build your profile once</p>
            <h2 className="font-editorial mt-3 break-keep text-[28px] font-bold tracking-[-0.03em] sm:text-[32px]">다음 포지션을 볼 준비부터 해두세요.</h2>
          </div>
          <Link href="/talent-pool/register" className="inline-flex min-h-[48px] w-fit items-center gap-3 rounded-lg bg-brand-cream px-6 py-3 text-[13px] font-bold text-brand-espresso transition hover:bg-white">
            인재풀 등록 시작
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  );
}

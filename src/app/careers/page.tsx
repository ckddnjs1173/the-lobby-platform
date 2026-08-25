import type { Metadata } from "next";
import Link from "next/link";

import PublicHeader from "../../components/public/PublicHeader";

export const metadata: Metadata = {
  title: "리셉션 커리어 가이드 | The Lobby",
  description:
    "기업 리셉션, 자동차 서비스센터, 호텔 프론트, 메디컬 리셉션, VIP 라운지 직무의 실제 업무와 채용공고 확인 포인트를 정리한 The Lobby 커리어 가이드입니다.",
};

const careerTracks = [
  {
    id: "corporate-reception",
    number: "01",
    title: "기업 리셉션",
    english: "Corporate Reception",
    summary:
      "기업의 첫 접점을 운영하며 방문객, 임직원, 회의 공간과 출입 흐름을 안정적으로 연결하는 역할입니다.",
    duties: [
      "방문객 확인·응대 및 담당 부서 연결",
      "회의실·출입·전화 등 프런트 운영 지원",
      "외부 VIP와 주요 방문 일정의 사전 확인 및 인계",
    ],
    strengths: ["차분하고 정확한 커뮤니케이션", "인수인계와 일정 관리", "상황에 맞는 응대 톤"],
    checks: ["안내데스크 단독/팀 운영 여부", "근무시간과 교대 여부", "외국어·VIP 응대 비중"],
  },
  {
    id: "automotive-reception",
    number: "02",
    title: "자동차 서비스 리셉션",
    english: "Automotive Service Reception",
    summary:
      "서비스센터를 방문하는 고객의 첫 응대부터 AS 접수·예약·대기 안내까지 서비스 흐름을 연결합니다.",
    duties: [
      "서비스센터 내방 고객 응대 및 동선 안내",
      "차량 AS 접수·예약 및 문의 전화 응대",
      "대기 고객 지원과 센터 내 상품·운영 업무 보조",
    ],
    strengths: ["고객 불편 상황의 침착한 응대", "예약·접수의 정확성", "여러 요청의 우선순위 판단"],
    checks: ["토요일·주말 근무 여부", "기본급과 성과급·수당 구분", "실근무처와 소속회사 구분"],
  },
  {
    id: "hotel-front",
    number: "03",
    title: "호텔 프론트",
    english: "Hotel Front Desk",
    summary:
      "체크인·체크아웃, 예약 확인, 투숙 중 문의 대응을 통해 고객의 체류 경험을 운영하는 직무입니다.",
    duties: [
      "체크인·체크아웃 및 예약 정보 확인",
      "투숙객 문의·요청 접수와 관련 부서 연결",
      "교대 근무 시 고객 이슈와 운영사항 인수인계",
    ],
    strengths: ["서비스 회복 커뮤니케이션", "정확한 예약·정보 확인", "교대 간 명확한 인수인계"],
    checks: ["교대·야간 근무 구성", "외국어 사용 빈도", "프론트 외 담당 업무 범위"],
  },
  {
    id: "medical-reception",
    number: "04",
    title: "메디컬 리셉션",
    english: "Medical Reception",
    summary:
      "병원·클리닉의 예약과 접수, 내원 안내를 담당하며 정확한 정보 처리와 안정적인 고객 응대가 중요한 역할입니다.",
    duties: [
      "내원 고객 접수 및 예약 일정 확인",
      "진료·검사 동선 안내와 문의 응대",
      "접수 정보와 요청사항의 정확한 전달·관리",
    ],
    strengths: ["개인정보를 다루는 신중함", "긴장한 고객을 배려하는 응대", "정확한 정보 확인"],
    checks: ["평일·주말 운영시간", "접수와 상담의 업무 범위", "요구되는 관련 경력·자격 여부"],
  },
  {
    id: "vip-lounge",
    number: "05",
    title: "VIP 라운지",
    english: "VIP Lounge & Guest Relations",
    summary:
      "예약 고객과 주요 내방객의 경험을 세심하게 관리하며 공간·서비스·담당자 간 연결을 책임지는 직무입니다.",
    duties: [
      "VIP·예약 고객 확인 및 좌석·공간 안내",
      "라운지 서비스와 고객 요청의 신속한 연결",
      "특이사항 기록 및 다음 담당자에게 정확히 인계",
    ],
    strengths: ["절제된 서비스 매너", "디테일한 사전 준비", "예외 상황에서도 흔들리지 않는 응대"],
    checks: ["VIP 응대 프로토콜", "외국어 사용 여부", "교대·유니폼·서비스 범위"],
  },
] as const;

const fitQuestions = [
  "처음 만나는 사람에게도 안정적인 톤으로 안내할 수 있는가",
  "여러 요청이 동시에 들어올 때 우선순위를 정리할 수 있는가",
  "작은 변경사항도 기록하고 다음 담당자에게 정확히 전달하는가",
  "감정적인 고객 앞에서도 사실과 절차를 분리해 설명할 수 있는가",
  "복장·언어·공간 상태 등 서비스 디테일을 꾸준히 관리할 수 있는가",
] as const;

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-brand-light text-brand-ink">
      <PublicHeader />

      <main>
        <section className="border-b border-brand-line bg-[linear-gradient(180deg,#fbf8f3_0%,#f6efe5_100%)]">
          <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-bronze">
                Career Guide <span className="h-px w-12 bg-brand-gold/55" /> Reception Specialist
              </div>
              <h1 className="font-editorial mt-6 max-w-3xl text-[38px] font-bold leading-[1.22] tracking-[-0.045em] text-brand-espresso sm:text-[48px] lg:text-[56px]">
                리셉션 커리어를<br className="hidden sm:block" /> 직무별로 이해하세요.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-brand-muted sm:text-base sm:leading-8">
                같은 리셉션이라도 근무 환경과 고객 접점에 따라 실제 업무는 달라집니다. The Lobby는 공고를 보기 전에 역할의 핵심과 확인해야 할 근무조건을 빠르게 이해할 수 있도록 정리합니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/jobs" className="inline-flex min-h-12 items-center rounded-lg bg-brand-bronze px-5 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso">
                  현재 채용공고 보기 <span className="ml-2" aria-hidden="true">→</span>
                </Link>
                <Link href="/talent-pool" className="inline-flex min-h-12 items-center rounded-lg border border-brand-gold/35 bg-white px-5 py-3 text-sm font-bold text-brand-bronze transition hover:bg-brand-ivory">
                  인재풀 먼저 등록하기
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-brand-line bg-white">
          <div className="mx-auto grid max-w-[1320px] gap-px bg-brand-line px-6 sm:px-8 md:grid-cols-3 lg:px-10">
            {[
              ["ROLE", "실제 하는 일", "직무명보다 현장에서 반복되는 고객 접점과 운영 업무를 먼저 봅니다."],
              ["FIT", "필요한 역량", "막연한 친절함보다 정확성, 인계, 우선순위 판단처럼 업무에 연결되는 역량을 봅니다."],
              ["CHECK", "공고 확인 포인트", "소속회사, 근무시간, 교대, 수당처럼 입사 후 체감이 큰 조건을 분리해서 확인합니다."],
            ].map(([label, title, copy]) => (
              <div key={label} className="bg-white py-8 md:px-7 lg:px-9">
                <p className="text-[11px] font-bold tracking-[0.18em] text-brand-bronze">{label}</p>
                <h2 className="mt-2 text-base font-bold text-brand-espresso">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-5 border-b border-brand-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Reception Tracks</p>
              <h2 className="font-editorial mt-3 text-[32px] font-bold tracking-[-0.04em] text-brand-espresso sm:text-[38px]">어떤 리셉션 업무인가요?</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-brand-muted">
              아래 내용은 직무를 이해하기 위한 일반 가이드입니다. 급여, 근무시간, 고용형태, 담당 범위는 반드시 개별 채용공고의 실제 조건을 기준으로 확인하세요.
            </p>
          </div>

          <div className="divide-y divide-brand-line">
            {careerTracks.map((track) => (
              <article id={track.id} key={track.id} className="scroll-mt-28 py-10 sm:py-12">
                <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
                  <div>
                    <p className="font-editorial text-[28px] text-brand-gold/80">{track.number}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">{track.english}</p>
                    <h3 className="font-editorial mt-2 text-[26px] font-bold tracking-[-0.035em] text-brand-espresso">{track.title}</h3>
                  </div>

                  <div className="min-w-0">
                    <p className="max-w-3xl text-base leading-8 text-brand-ink/85">{track.summary}</p>
                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">실제 하는 일</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-ink/80">
                          {track.duties.map((item) => <li key={item} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-gold" />{item}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">강점이 되는 역량</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-ink/80">
                          {track.strengths.map((item) => <li key={item} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-gold" />{item}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-brand-line bg-brand-ivory/70 p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">공고에서 확인</p>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-ink/80">
                          {track.checks.map((item) => <li key={item} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-bronze" />{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-brand-line bg-brand-espresso text-white">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-14 sm:px-8 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-gold">Career Fit Check</p>
              <h2 className="font-editorial mt-3 text-[30px] font-bold leading-tight text-white sm:text-[36px]">리셉션 업무와<br />내 강점이 맞는지 확인하세요.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-brand-cream/75">모든 항목에 해당할 필요는 없습니다. 반복해서 강점이 드러나는 항목이 있다면 프로필 경력 요약과 면접 사례에 구체적으로 남겨두는 것이 좋습니다.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {fitQuestions.map((question, index) => (
                <li key={question} className="flex min-h-24 gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="font-editorial shrink-0 text-xl text-brand-gold">{String(index + 1).padStart(2, "0")}</span>
                  <p className="text-sm leading-6 text-brand-cream/90">{question}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="rounded-2xl border border-brand-gold/30 bg-white p-7 shadow-card sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Next Opportunity</p>
              <h2 className="font-editorial mt-3 text-[28px] font-bold tracking-[-0.035em] text-brand-espresso sm:text-[34px]">지금 맞는 공고가 없다면, 프로필부터 준비해두세요.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-muted">인재풀 공개에 동의한 프로필만 J&C 내부 검토 대상이 됩니다. 기업에 자동 제출되지 않으며, 실제 포지션 제안은 후보자가 수락한 뒤 지원 절차로 이어집니다.</p>
            </div>
            <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0">
              <Link href="/talent-pool/register" className="inline-flex min-h-12 items-center rounded-lg bg-brand-bronze px-5 py-3 text-sm font-bold text-white hover:bg-brand-espresso">인재풀 등록 →</Link>
              <Link href="/jobs" className="inline-flex min-h-12 items-center rounded-lg border border-brand-line bg-brand-light px-5 py-3 text-sm font-bold text-brand-espresso hover:bg-brand-ivory">채용공고 보기</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-line bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-7 text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>THE LOBBY · Reception Career Studio</p>
          <div className="flex gap-4"><Link href="/privacy" className="hover:text-brand-bronze">개인정보 처리방침</Link><Link href="/terms" className="hover:text-brand-bronze">이용약관</Link></div>
        </div>
      </footer>
    </div>
  );
}

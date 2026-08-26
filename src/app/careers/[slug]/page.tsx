import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicHeader from "../../../components/public/PublicHeader";
import {
  careerTracks,
  getReceptionCareerTrack,
} from "../../../lib/receptionCareerGuide";

export function generateStaticParams() {
  return careerTracks.map((track) => ({ slug: track.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = getReceptionCareerTrack(slug);

  if (!track) {
    return { title: "리셉션 커리어 가이드 | The Lobby" };
  }

  return {
    title: `${track.title} 커리어 가이드 | The Lobby`,
    description: `${track.title}의 실제 업무, 강점이 되는 역량, 공고 확인 포인트와 이력서·면접 준비 질문을 정리한 The Lobby 리셉션 커리어 가이드입니다.`,
  };
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-ink/80">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const track = getReceptionCareerTrack(slug);

  if (!track) notFound();

  const relatedTracks = careerTracks.filter((item) => item.id !== track.id);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${track.title} 커리어 가이드`,
    description: track.summary,
    about: track.title,
    isPartOf: {
      "@type": "WebSite",
      name: "The Lobby",
    },
  };

  return (
    <div className="min-h-screen bg-brand-light text-brand-ink">
      <PublicHeader />

      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        <section className="border-b border-brand-line bg-[linear-gradient(180deg,#fbf8f3_0%,#f6efe5_100%)]">
          <div className="mx-auto max-w-[1180px] px-6 py-14 sm:px-8 sm:py-18 lg:px-10 lg:py-20">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-brand-muted">
              <Link href="/careers" className="hover:text-brand-bronze">커리어 가이드</Link>
              <span aria-hidden="true">›</span>
              <span className="text-brand-bronze">{track.title}</span>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bronze">
                  {track.english}
                </p>
                <h1 className="font-editorial mt-3 text-[40px] font-bold tracking-[-0.045em] text-brand-espresso sm:text-[50px]">
                  {track.title} 커리어 가이드
                </h1>
                <p className="mt-5 max-w-3xl text-[15px] leading-8 text-brand-muted sm:text-base">
                  {track.summary}
                </p>
              </div>

              <div className="rounded-xl border border-brand-gold/30 bg-white p-5 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">공고 확인 원칙</p>
                <p className="mt-3 text-sm leading-6 text-brand-muted">
                  이 페이지는 직무 이해를 위한 일반 가이드입니다. 실제 급여·근무시간·고용형태·업무범위는 반드시 개별 공고의 조건을 기준으로 확인하세요.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">Role</p>
              <h2 className="mt-2 text-base font-bold text-brand-espresso">실제 하는 일</h2>
              <BulletList items={track.duties} />
            </article>
            <article className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">Strength</p>
              <h2 className="mt-2 text-base font-bold text-brand-espresso">강점이 되는 역량</h2>
              <BulletList items={track.strengths} />
            </article>
            <article className="rounded-xl border border-brand-gold/30 bg-brand-ivory/70 p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">Check</p>
              <h2 className="mt-2 text-base font-bold text-brand-espresso">공고에서 확인할 조건</h2>
              <BulletList items={track.checks} />
            </article>
          </div>
        </section>

        <section className="border-y border-brand-line bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-14 sm:px-8 sm:py-16 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Work Flow</p>
              <h2 className="font-editorial mt-3 text-[30px] font-bold tracking-[-0.035em] text-brand-espresso sm:text-[36px]">
                하루 업무는 이렇게 이어집니다.
              </h2>
              <p className="mt-3 text-sm leading-7 text-brand-muted">
                사업장마다 세부 절차는 다르지만, 리셉션 업무는 준비 → 현장 응대 → 기록·인계의 흐름을 반복적으로 관리하는 경우가 많습니다.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {track.workFlow.map(([label, title, description], index) => (
                <article key={label} className="relative rounded-xl border border-brand-line bg-brand-light p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-[0.16em] text-brand-bronze">{label}</span>
                    <span className="font-editorial text-2xl text-brand-gold/80">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-brand-espresso">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-brand-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">Profile Evidence</p>
              <h2 className="font-editorial mt-3 text-[26px] font-bold text-brand-espresso">이력서에는 ‘친절함’보다 사례를 남기세요.</h2>
              <p className="mt-3 text-sm leading-7 text-brand-muted">
                아래 질문에 답할 수 있는 실제 경험이 있다면 회사명·기간·역할과 함께 구체적인 행동을 정리하는 편이 좋습니다.
              </p>
              <ol className="mt-5 space-y-3">
                {track.profileEvidence.map((item, index) => (
                  <li key={item} className="flex gap-3 rounded-lg bg-brand-light p-4 text-sm leading-6 text-brand-ink/85">
                    <span className="font-editorial shrink-0 text-brand-bronze">{String(index + 1).padStart(2, "0")}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-xl border border-brand-line bg-brand-espresso p-6 text-white shadow-card sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">Interview Prep</p>
              <h2 className="font-editorial mt-3 text-[26px] font-bold text-white">면접에서는 판단 순서를 설명하세요.</h2>
              <p className="mt-3 text-sm leading-7 text-brand-cream/75">
                정답을 외우기보다 무엇을 먼저 확인하고 누구에게 연결하며 어떻게 기록할지 순서로 답변을 준비하면 실제 업무 경험을 보여주기 좋습니다.
              </p>
              <ol className="mt-5 space-y-3">
                {track.interviewPrompts.map((item, index) => (
                  <li key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-brand-cream/90">
                    <span className="font-editorial shrink-0 text-brand-gold">Q{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section className="border-t border-brand-line bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-12 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">Other Tracks</p>
                <h2 className="font-editorial mt-2 text-[26px] font-bold text-brand-espresso">다른 리셉션 직무도 비교해보세요.</h2>
              </div>
              <Link href="/careers" className="text-sm font-bold text-brand-bronze hover:underline">전체 가이드 보기 →</Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedTracks.map((item) => (
                <Link
                  key={item.id}
                  href={`/careers/${item.id}`}
                  className="rounded-xl border border-brand-line bg-brand-light p-4 transition hover:border-brand-gold/50 hover:bg-brand-ivory"
                >
                  <p className="text-[11px] font-bold text-brand-bronze">{item.english}</p>
                  <p className="mt-2 text-sm font-bold text-brand-espresso">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="rounded-2xl border border-brand-gold/30 bg-white p-7 shadow-card sm:p-9 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">Next Step</p>
              <h2 className="font-editorial mt-3 text-[28px] font-bold text-brand-espresso">실제 공고의 근무조건을 비교해보세요.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-muted">
                현재 맞는 공고가 없다면 인재풀 프로필을 준비할 수 있습니다. 인재풀 공개 동의만으로 기업 지원이 자동 생성되지는 않습니다.
              </p>
            </div>
            <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0">
              <Link href="/jobs" className="inline-flex min-h-12 items-center rounded-lg bg-brand-bronze px-5 py-3 text-sm font-bold text-white hover:bg-brand-espresso">채용공고 보기 →</Link>
              <Link href="/talent-pool/register" className="inline-flex min-h-12 items-center rounded-lg border border-brand-line bg-brand-light px-5 py-3 text-sm font-bold text-brand-espresso hover:bg-brand-ivory">인재풀 등록</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-6 py-7 text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>THE LOBBY · Reception Career Studio</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-bronze">개인정보 처리방침</Link>
            <Link href="/terms" className="hover:text-brand-bronze">이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

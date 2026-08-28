import type { PublicJobView } from "../../lib/publicJobTypes";

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-brand-line bg-white px-4 py-3">
      <dt className="text-[10px] font-bold text-brand-muted">{label}</dt>
      <dd className="mt-1 break-keep text-[13px] font-bold leading-5 text-brand-espresso">{value}</dd>
    </div>
  );
}

export default function JobOperationalDetailsPanel({ job }: { job: PublicJobView }) {
  const details = [
    job.workSchedule,
    job.workHours,
    job.breakTime,
    job.contractPeriod,
    job.conversionOpportunity,
    job.experienceLevel,
    job.educationLevel,
    job.headcount,
    job.nearbyTransit,
    job.detailedLocation,
    job.applicationDeadline,
  ];
  const hasDetails = details.some(Boolean) || Boolean(job.benefits?.length);
  if (!hasDetails) return null;

  return (
    <section className="mx-auto mt-5 max-w-[1460px] px-5 sm:px-8 lg:px-10">
      <div className="rounded-xl border border-brand-line bg-brand-ivory/55 p-5 shadow-card sm:p-7">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Working Conditions</p>
          <h2 className="font-editorial mt-2 text-[26px] text-brand-espresso">근무·채용 상세조건</h2>
          <p className="mt-2 text-xs leading-5 text-brand-muted">지원 전에 실제 근무조건과 채용 일정을 확인하세요.</p>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Detail label="근무요일" value={job.workSchedule} />
          <Detail label="근무시간" value={job.workHours} />
          <Detail label="휴게시간" value={job.breakTime} />
          <Detail label="계약기간" value={job.contractPeriod} />
          <Detail label="정규직 전환" value={job.conversionOpportunity} />
          <Detail label="경력조건" value={job.experienceLevel} />
          <Detail label="학력조건" value={job.educationLevel} />
          <Detail label="모집인원" value={job.headcount} />
          <Detail label="인근 교통" value={job.nearbyTransit} />
          <Detail label="상세 근무지" value={job.detailedLocation} />
          <Detail label="채용 마감일" value={job.applicationDeadline} />
        </dl>

        {job.benefits?.length ? (
          <div className="mt-5 rounded-lg border border-brand-line bg-white px-4 py-4">
            <p className="text-[10px] font-bold text-brand-muted">복리후생</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.benefits.map((benefit) => (
                <span key={benefit} className="rounded-full border border-brand-line bg-brand-light px-3 py-1.5 text-[11px] font-semibold text-brand-ink">{benefit}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

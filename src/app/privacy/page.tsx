import Link from "next/link";

const operatorName =
  process.env.NEXT_PUBLIC_SERVICE_OPERATOR_NAME?.trim() || "제이앤씨";
const privacyContact =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-light px-5 py-16 text-brand-ink sm:px-8">
      <article className="mx-auto max-w-4xl rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Privacy Policy</p>
        <h1 className="font-editorial mt-3 text-[38px] text-brand-espresso">개인정보 처리방침</h1>
        <p className="mt-4 text-sm leading-7 text-brand-muted">
          {operatorName}가 운영하는 The Lobby는 후보자 채용 지원과 인재풀 운영에 필요한 개인정보를 아래 목적 범위에서 처리합니다.
        </p>

        {!privacyContact ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            공개 운영 전 개인정보 보호 담당 연락처를 환경설정 <code>NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL</code>에 확정해야 합니다. 현재 페이지는 제품 구조와 고지 항목 검토용입니다.
          </div>
        ) : null}

        <div className="mt-9 space-y-8 text-sm leading-7 text-brand-ink/85">
          <section><h2 className="text-base font-bold text-brand-espresso">1. 처리 목적</h2><p className="mt-2">Candidate 계정 및 프로필 운영, 채용공고 지원 처리, 지원현황·면접 일정 제공, J&C 인재풀 공개에 동의한 후보자의 채용 기회 검토, 서비스 보안 및 장애 대응을 위해 개인정보를 처리합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">2. 처리 항목</h2><p className="mt-2">이름, 이메일, 연락처, 경력, 학력, 스킬, 프로필 헤드라인, 경력 요약, 희망 직무·지역·급여·고용형태·입사 가능일·구직 상태, 지원 및 면접 진행정보, 인재풀 공개 및 알림 수신 동의 이력을 처리할 수 있습니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">3. 보유 및 이용 기간</h2><p className="mt-2">서비스 제공 및 채용 절차 운영에 필요한 기간 동안 보유하며, 회원 탈퇴·삭제 요청 또는 처리 목적 달성 시 지체 없이 파기하는 것을 원칙으로 합니다. 관계 법령에 따라 일정 기간 보존이 필요한 정보는 해당 법령에서 정한 기간 동안 분리 보관할 수 있습니다. 실제 운영 정책의 세부 보유기간은 공개 전 최종 확정합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">4. J&C 공개 인재풀</h2><p className="mt-2">후보자가 인재풀 공개에 별도로 동의한 경우에만 J&C ADMIN이 후보자 프로필과 연락처를 검색할 수 있습니다. 기업별 RECRUITER에게 자동으로 공개하지 않으며, 후보자는 Candidate 메뉴의 인재풀 설정에서 공개 동의를 철회할 수 있습니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">5. 제3자 제공 및 처리위탁</h2><p className="mt-2">채용 진행 과정에서 고객사에 후보자 정보를 제공할 필요가 있는 경우 제공 목적·항목·제공받는 자·보유기간 등 필요한 고지와 법적 근거를 확인한 뒤 처리합니다. Firebase, Vercel, AI 처리 사업자 등 서비스 운영에 필요한 처리위탁 또는 국외 처리 사항은 실제 운영 계약과 데이터 흐름을 기준으로 공개 전 최종 고지합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">6. 정보주체의 권리</h2><p className="mt-2">후보자는 자신의 프로필을 조회·수정하고, 인재풀 공개를 중지할 수 있습니다. 개인정보 열람·정정·삭제·처리정지 등 추가 요청은 개인정보 보호 담당 채널을 통해 접수할 수 있습니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">7. 파기 및 안전성 확보</h2><p className="mt-2">보유 필요가 없어진 개인정보는 복구가 어렵도록 파기하며, 접근권한 관리·인증·서버 측 권한 검증·테넌트 분리 등 서비스 구조에 맞는 기술적·관리적 보호조치를 적용합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">8. 개인정보 보호 문의</h2><p className="mt-2">운영자: {operatorName}</p><p>{privacyContact ? `문의: ${privacyContact}` : "문의: 공개 운영 전 담당 연락처 확정 필요"}</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">9. 변경 고지</h2><p className="mt-2">본 방침의 내용이 변경되는 경우 서비스 화면을 통해 변경 내용을 고지합니다.</p></section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-brand-line pt-6">
          <Link href="/talent-pool/settings" className="rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-bold text-white">인재풀 설정</Link>
          <Link href="/" className="rounded-lg border border-brand-line px-4 py-2.5 text-xs font-bold text-brand-muted">홈으로</Link>
        </div>
      </article>
    </main>
  );
}

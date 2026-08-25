import Link from "next/link";

const operatorName = "박창원";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-brand-light px-5 py-16 text-brand-ink sm:px-8">
      <article className="mx-auto max-w-4xl rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Terms of Service</p>
        <h1 className="font-editorial mt-3 text-[38px] text-brand-espresso">The Lobby 이용약관</h1>
        <p className="mt-4 text-sm leading-7 text-brand-muted">
          본 약관은 {operatorName}이 개인 운영자로서 운영하는 The Lobby Candidate 서비스의 기본 이용조건을 정합니다. 공개 운영 전 운영자 주소·연락처 및 사업자등록정보(해당하는 경우)를 최종 확인해야 합니다.
        </p>

        <div className="mt-9 space-y-8 text-sm leading-7 text-brand-ink/85">
          <section><h2 className="text-base font-bold text-brand-espresso">1. 서비스 목적</h2><p className="mt-2">The Lobby는 리셉션·프론트·VIP 고객서비스 등 관련 직무의 채용공고 탐색, Candidate 프로필 관리, 지원 진행상태 확인 및 J&C 인재풀 등록 기능을 제공합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">2. 계정 및 정보의 정확성</h2><p className="mt-2">이용자는 본인의 정보를 정확하게 입력하고 계정 접근정보를 안전하게 관리해야 합니다. 타인의 정보를 도용하거나 허위 경력·학력·자격 정보를 등록해서는 안 됩니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">3. 채용공고 및 지원</h2><p className="mt-2">공개 채용공고의 조건은 채용 진행 과정에서 고객사 사정에 따라 변경되거나 마감될 수 있습니다. The Lobby는 지원 접수와 채용 진행을 지원하지만 특정 채용 결과를 보장하지 않습니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">4. 인재풀 공개</h2><p className="mt-2">후보자가 J&C 인재풀 공개에 동의한 경우에만 J&C 내부 ADMIN이 후보자 프로필을 검색할 수 있습니다. 공개 동의는 언제든 설정 화면에서 철회할 수 있으며, 철회 후 신규 인재풀 검색 대상에서 제외됩니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">5. 금지행위</h2><p className="mt-2">서비스의 정상 운영을 방해하는 자동화 요청, 타인의 개인정보 수집, 권한 없는 관리자 화면 접근 시도, 악성 코드 전송, 허위·불법 채용정보 또는 지원정보 등록 등은 금지됩니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">6. 서비스 변경 및 중단</h2><p className="mt-2">보안, 유지보수, 시스템 장애, 외부 서비스 장애 또는 운영상 필요한 사유가 있는 경우 서비스 일부가 변경되거나 일시 중단될 수 있습니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">7. 개인정보</h2><p className="mt-2">개인정보 처리에 관한 사항은 별도의 <Link href="/privacy" className="font-bold text-brand-bronze underline">개인정보 처리방침</Link>에 따릅니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">8. 운영자 정보</h2><p className="mt-2">운영자: {operatorName}</p><p>주소·연락처 및 사업자등록정보(해당하는 경우)는 공개 운영 전 최종 확정하여 고지합니다.</p></section>
          <section><h2 className="text-base font-bold text-brand-espresso">9. 약관 변경</h2><p className="mt-2">서비스 운영상 필요한 경우 관련 법령에 따라 약관을 변경할 수 있으며, 중요한 변경사항은 서비스 화면을 통해 고지합니다.</p></section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-brand-line pt-6">
          <Link href="/talent-pool/settings" className="rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-bold text-white">인재풀 설정</Link>
          <Link href="/" className="rounded-lg border border-brand-line px-4 py-2.5 text-xs font-bold text-brand-muted">홈으로</Link>
        </div>
      </article>
    </main>
  );
}

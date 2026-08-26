import Link from "next/link";

const operatorName = "박창원";
const publicLaunchMode = process.env.PUBLIC_LAUNCH_MODE?.trim().toLowerCase() === "true";
const privacyContact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "";
const operatorAddress = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS?.trim() || "";
const customerSupportContact =
  process.env.NEXT_PUBLIC_CUSTOMER_SUPPORT_CONTACT?.trim() || "";
const accountProfileRetention =
  process.env.NEXT_PUBLIC_ACCOUNT_PROFILE_RETENTION?.trim() || "";
const talentPoolRetention =
  process.env.NEXT_PUBLIC_TALENT_POOL_RETENTION?.trim() || "";
const applicationRetention =
  process.env.NEXT_PUBLIC_APPLICATION_RETENTION?.trim() || "";
const consentRetention =
  process.env.NEXT_PUBLIC_CONSENT_RETENTION?.trim() || "";
const infraProcessingDisclosure =
  process.env.NEXT_PUBLIC_INFRA_PROCESSING_DISCLOSURE?.trim() || "";

const previewFallback = "공개 운영 전 확정 필요";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-light px-5 py-16 text-brand-ink sm:px-8">
      <article className="mx-auto max-w-4xl rounded-xl border border-brand-line bg-white p-6 shadow-card sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Privacy Policy</p>
        <h1 className="font-editorial mt-3 text-[38px] text-brand-espresso">개인정보 처리방침</h1>
        <p className="mt-4 text-sm leading-7 text-brand-muted">
          {operatorName}이 개인 운영자로서 운영하는 The Lobby는 후보자 채용 지원과 인재풀 운영에 필요한 개인정보를 아래 목적 범위에서 처리합니다.
        </p>

        {!publicLaunchMode ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            현재는 공개 출시 전 검토 모드입니다. 실제 공개 시에는 <code>NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL</code>을 포함한 운영자 연락처·주소·보유기간·인프라 처리 고지가 모두 확정되어야 하며, 출시 검증과 readiness가 누락값을 차단합니다.
          </div>
        ) : null}

        <div className="mt-9 space-y-8 text-sm leading-7 text-brand-ink/85">
          <section>
            <h2 className="text-base font-bold text-brand-espresso">1. 처리 목적</h2>
            <p className="mt-2">Candidate 계정 및 프로필 운영, 채용공고 지원 처리, 지원현황·면접 일정 제공, J&C 인재풀 공개에 동의한 후보자의 채용 기회 검토, 서비스 보안 및 장애 대응을 위해 개인정보를 처리합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">2. 처리 항목</h2>
            <p className="mt-2">이름, 이메일, 연락처, 경력, 학력, 스킬, 프로필 헤드라인, 경력 요약, 희망 직무·지역·급여·고용형태·입사 가능일·구직 상태, 지원 및 면접 진행정보, 인재풀 공개 및 알림 수신 동의 이력을 처리할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">3. 보유 및 이용 기간</h2>
            <p className="mt-2">처리 목적 달성, 회원 탈퇴·삭제 요청 또는 아래 운영정책상 보유기간 종료 시 지체 없이 파기하는 것을 원칙으로 하며, 관계 법령에 따라 별도 보존이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>계정 및 Candidate 프로필: {accountProfileRetention || previewFallback}</li>
              <li>J&C 인재풀 프로필·선호정보: {talentPoolRetention || previewFallback}</li>
              <li>지원·ATS·면접 기록: {applicationRetention || previewFallback}</li>
              <li>동의·철회 기록: {consentRetention || previewFallback}</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">4. J&C 공개 인재풀</h2>
            <p className="mt-2">후보자가 인재풀 공개에 별도로 동의한 경우에만 J&C ADMIN이 후보자 프로필과 연락처를 검색할 수 있습니다. 기업별 RECRUITER에게 자동으로 공개하지 않으며, 후보자는 Candidate 메뉴의 인재풀 설정에서 공개 동의를 철회할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">5. 제3자 제공 및 서비스 인프라</h2>
            <p className="mt-2">후보자가 채용공고에 직접 지원하거나 J&C의 포지션 제안을 명시적으로 수락하는 등 채용 진행 의사를 표시한 범위에서 고객사 채용 절차에 필요한 정보가 처리될 수 있습니다. 개별 제공이 필요한 경우 관련 법령에 따른 제공 목적·항목·제공받는 자·보유기간 및 법적 근거를 확인하여 처리합니다.</p>
            <p className="mt-2">Firebase Authentication은 미국 데이터센터에서 인증 데이터를 처리합니다. Cloud Firestore 기본 데이터베이스는 서울 리전(asia-northeast3)에 구성되어 있습니다.</p>
            <p className="mt-2">{infraProcessingDisclosure || previewFallback}</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">6. AI 이력서 분석 시 국외 처리</h2>
            <p className="mt-2">AI 이력서 분석은 선택 기능입니다. 이용자가 별도 동의하고 AI 분석을 실행하는 경우, 서버에서 추출한 이력서 텍스트(이름·연락처·이메일·경력·학력 등이 포함될 수 있음)가 미국의 Groq LLC(P.O. Box 1778, Mountain View, CA 94042, USA)로 API를 통해 암호화 전송되어 프로필 구조화에 사용됩니다. 원본 이력서 파일 자체는 Groq에 전송하지 않습니다. Groq의 일반 inference 요청은 고객 입력·출력을 기본적으로 보관하지 않지만 시스템 안정성 또는 남용 조사 시 최대 30일 임시 보관될 수 있습니다. 동의를 거부하면 AI 분석은 사용할 수 없지만 직접 입력을 통한 프로필 등록은 가능합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">7. 정보주체의 권리</h2>
            <p className="mt-2">후보자는 자신의 프로필을 조회·수정하고 인재풀 공개를 중지할 수 있습니다. 개인정보 열람·정정·삭제·처리정지 등 추가 요청은 개인정보 보호 담당 채널을 통해 접수할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">8. 파기 및 안전성 확보</h2>
            <p className="mt-2">보유 필요가 없어진 개인정보는 복구가 어렵도록 파기하며, 접근권한 관리·인증·서버 측 권한 검증·테넌트 분리 등 서비스 구조에 맞는 기술적·관리적 보호조치를 적용합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">9. 개인정보 보호 및 고객 문의</h2>
            <p className="mt-2">운영자: {operatorName}</p>
            <p>주소: {operatorAddress || previewFallback}</p>
            <p>개인정보 문의: {privacyContact || previewFallback}</p>
            <p>고객·분쟁 문의: {customerSupportContact || previewFallback}</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-brand-espresso">10. 변경 고지</h2>
            <p className="mt-2">본 방침의 내용이 변경되는 경우 서비스 화면을 통해 변경 내용을 고지합니다.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-brand-line pt-6">
          <Link href="/talent-pool/settings" className="rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-bold text-white">인재풀 설정</Link>
          <Link href="/" className="rounded-lg border border-brand-line px-4 py-2.5 text-xs font-bold text-brand-muted">홈으로</Link>
        </div>
      </article>
    </main>
  );
}

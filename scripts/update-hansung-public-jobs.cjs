const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const CONFIRMATION = "CONFIRMED";
if (process.env.APPLY_HANSUNG_JOB_REFRESH !== CONFIRMATION) {
  throw new Error("APPLY_HANSUNG_JOB_REFRESH_CONFIRMATION_REQUIRED");
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_NOT_SET");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || serviceAccount.project_id,
});

const db = getFirestore();
const ORGANIZATION_ID = "jnc";

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function haystack(document) {
  const data = document.data;
  return normalize([
    document.id,
    data.title,
    data.company,
    data.displayCompany,
    data.location,
    data.detailedLocation,
    data.description,
    data.workplaceName,
  ].join(" "));
}

function targetMatches(document, target) {
  if (target.explicitIds?.includes(document.id)) return true;
  const text = haystack(document);
  return target.signals.some((signal) => text.includes(normalize(signal)));
}

function chooseUnique(target, matches) {
  if (matches.length === 1) return matches[0];

  const openMatches = matches.filter((item) => item.data.status === "OPEN");
  if (openMatches.length === 1) return openMatches[0];

  const diagnostic = matches.map((item) => ({
    jobId: item.id,
    status: item.data.status || null,
    title: item.data.title || null,
    location: item.data.location || null,
  }));

  throw new Error(
    `JOB_MATCH_NOT_UNIQUE:${target.key}:${JSON.stringify(diagnostic)}`
  );
}

const shared = {
  displayCompany: "Mercedes-Benz Official Dealer · 한성자동차㈜",
  employmentType: "파견계약직",
  employingCompany: "제이앤씨㈜",
  salary: "월 2,337,510원 + 성과급·수당 별도",
  salaryBase: "월 2,337,510원",
  salaryIncentive: "서비스센터 월 성과 달성 시 66,700원 추가",
  salaryAllowances: "연장근무 수당 별도 지급 / 미사용 연차수당 별도 지급",
  severancePay: "퇴직금 별도 지급",
  contractPeriod: "1년",
  breakTime: "60분",
  benefits: [
    "유니폼 제공",
    "4대보험",
    "퇴직금",
    "연차수당",
    "경조휴가 및 경조사비",
    "명절선물",
    "기타 회사 내규",
  ],
};

const targets = [
  {
    key: "yuseong",
    explicitIds: ["hansung-yuseong-reception-20260813"],
    signals: ["대전유성서비스센터", "북유성대로352"],
    update: {
      ...shared,
      title: "한성자동차㈜ 대전유성서비스센터 리셉션",
      workplaceName: "한성자동차㈜ 대전유성서비스센터",
      location: "대전 유성구",
      detailedLocation: "대전 유성구 북유성대로 352",
      description: [
        "서비스센터 내방 고객 응대 및 안내",
        "차량 AS 접수 및 일정 관리",
        "센터 문의 전화 응대 및 예약 접수",
        "센터 내 상품 판매 및 매출 관리",
      ].join("\n"),
      requirements: ["고객 응대 업무에 책임감 있게 임할 수 있는 분"],
      preferredQualifications: [
        "서비스업종 및 고객응대 경험자 우대",
        "성실하고 밝은 성격 우대",
        "1년 이상 근무 가능자 우대",
      ],
      workSchedule: "주 5일 월~금 / 격주 토요일 4시간 근무",
      workHours: "월~금 08:30~17:30 / 격주 토요일 08:30~12:30",
      hiringScheduleNote: "전형절차: 서류검토 → 면접 → 입사",
    },
  },
  {
    key: "anseong",
    signals: ["안성서비스센터", "서동대로3976", "공도읍서동대로3976"],
    update: {
      ...shared,
      title: "한성자동차㈜ 안성서비스센터 리셉션",
      workplaceName: "한성자동차㈜ 안성서비스센터",
      location: "경기 안성시",
      detailedLocation: "경기 안성시 공도읍 서동대로 3976",
      description: [
        "서비스센터 내방 고객 응대 및 안내",
        "차량 AS 접수 및 일정 관리",
        "센터 문의 전화 응대 및 예약 접수",
        "센터 내 상품 판매 및 매출 관리",
      ].join("\n"),
      requirements: ["책임감 있게 고객 응대 업무를 수행할 수 있는 분"],
      preferredQualifications: [
        "서비스업종 및 고객 응대 경험자",
        "성실하고 밝은 성격",
        "1년 이상 근무 가능자",
      ],
      workSchedule: "주 5일 월~금 / 격주 토요일 4시간 근무",
      workHours: "월~금 08:30~17:30 / 격주 토요일 08:00~12:00",
      interviewSchedule: "2026-08-18(화)~2026-08-20(목) 예정",
      expectedStartDate: "2026-08-24",
      hiringScheduleNote:
        "전형절차: 서류검토 → 면접 → 입사 / 일정은 채용 상황에 따라 변경될 수 있습니다.",
    },
  },
  {
    key: "incheon-seogu",
    signals: ["인천서구서비스센터", "북항로178번길4"],
    update: {
      ...shared,
      title: "한성자동차㈜ 인천서구 서비스센터 리셉션",
      workplaceName: "한성자동차㈜ 인천서구 서비스센터",
      location: "인천 서구",
      detailedLocation: "인천 서구 북항로178번길 4",
      description: [
        "서비스센터 방문 고객 응대 및 안내",
        "차량 AS 접수 및 일정 관리",
        "센터 관련 전화 문의 및 예약 접수",
        "센터 내 상품 문의 및 비용 안내",
      ].join("\n"),
      requirements: ["책임감 있게 고객 응대 업무를 수행할 수 있는 분"],
      preferredQualifications: [
        "서비스센터 및 고객응대 경험자",
        "1년 이상 근무 가능자",
      ],
      workSchedule: "주 5일 근무(월~금) / 주말·공휴일 근무 필수",
      workHours: "평일 08:30~17:30 / 주말·공휴일 08:30~12:30",
      hiringScheduleNote: "전형절차: 서류전형 → 면접 → 입사",
    },
  },
];

async function run() {
  const snapshot = await db
    .collection("jobs")
    .where("organizationId", "==", ORGANIZATION_ID)
    .get();

  const documents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
  }));

  console.log(`JNC_JOB_SCAN_COUNT:${documents.length}`);

  const resolved = targets.map((target) => {
    const matches = documents.filter((document) => targetMatches(document, target));
    console.log(
      `JOB_MATCH_CANDIDATES:${target.key}:${JSON.stringify(
        matches.map((item) => ({
          jobId: item.id,
          status: item.data.status || null,
          title: item.data.title || null,
          location: item.data.location || null,
        }))
      )}`
    );

    if (matches.length === 0) {
      throw new Error(`JOB_MATCH_NOT_FOUND:${target.key}`);
    }

    return {
      target,
      document: chooseUnique(target, matches),
    };
  });

  const uniqueIds = new Set(resolved.map((item) => item.document.id));
  if (uniqueIds.size !== resolved.length) {
    throw new Error("JOB_MATCH_OVERLAP");
  }

  for (const { target, document } of resolved) {
    console.log(
      `JOB_MATCH_RESOLVED:${target.key}:${document.id}:${document.data.status || "UNKNOWN"}:${document.data.title || ""}`
    );
  }

  const batch = db.batch();
  for (const { target, document } of resolved) {
    batch.update(document.ref, {
      ...target.update,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  for (const { target, document } of resolved) {
    const readback = await document.ref.get();
    const data = readback.data();
    if (!data) {
      throw new Error(`JOB_READBACK_MISSING:${target.key}`);
    }

    const expected = target.update;
    const checks = [
      data.title === expected.title,
      data.workplaceName === expected.workplaceName,
      data.employingCompany === expected.employingCompany,
      data.salaryBase === expected.salaryBase,
      data.detailedLocation === expected.detailedLocation,
    ];

    if (checks.some((value) => !value)) {
      throw new Error(`JOB_READBACK_MISMATCH:${target.key}:${document.id}`);
    }

    console.log(
      `JOB_REFRESH_APPLIED:${target.key}:${document.id}:${data.title}`
    );
  }

  console.log("HANSUNG_PUBLIC_JOB_REFRESH_APPLIED");
}

run().catch((error) => {
  console.error(
    "HANSUNG_PUBLIC_JOB_REFRESH_FAILED:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});

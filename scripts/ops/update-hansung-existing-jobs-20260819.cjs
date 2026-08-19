const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: env("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: env("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

const commonBenefits = [
  "4대보험 가입",
  "퇴직금 지급",
  "연차수당 지급",
  "경조휴가 및 경조사비 지원",
  "명절선물 지급",
  "기타 회사 내규에 따름",
];

const updates = [
  {
    jobId: "hansung-yuseong-reception-20260813",
    requiredToken: "대전유성서비스센터",
    data: {
      displayCompany: "한성자동차㈜",
      title: "한성자동차㈜ 대전유성서비스센터 리셉션 채용",
      description: [
        "고객 응대 경험을 바탕으로 서비스센터의 첫인상을 함께 만들어갈 분을 모집합니다.",
        "",
        "담당업무",
        "· 서비스센터 내방 고객 응대 및 안내",
        "· 차량 AS 접수 및 일정 관리",
        "· 센터 문의 전화 응대 및 예약 접수",
        "· 센터 내 상품 판매 및 매출 관리",
        "",
        "전형절차",
        "서류검토 → 면접 → 입사",
      ].join("\n"),
      requirements: ["고객 응대 업무에 책임감 있게 임하실 수 있는 분"],
      preferredQualifications: [
        "서비스업종 및 고객응대 경험자",
        "성실하고 밝은 성격을 보유하신 분",
        "1년 이상 근무 가능자",
      ],
      salary: "월 2,337,510원 · 월 성과 달성 시 66,700원 추가 · 연장근무/미사용 연차수당/퇴직금 별도",
      location: "대전 유성구",
      employmentType: "제이앤씨㈜ 소속 파견계약직 · 1년",
      workSchedule: "주 5일 근무(월~금) / 격주 토요일 4시간 근무",
      workHours: "월~금 08:30~17:30 / 격주 토요일 08:30~12:30",
      breakTime: "60분",
      contractPeriod: "1년",
      conversionOpportunity: "",
      experienceLevel: "",
      educationLevel: "",
      headcount: "",
      benefits: ["유니폼 지급", ...commonBenefits],
      nearbyTransit: "",
      detailedLocation: "대전 유성구 북유성대로 352",
      applicationDeadline: "",
    },
  },
  {
    jobId: "mM1tcG8eaqQV0w4QCqkD",
    requiredToken: "안성서비스센터",
    data: {
      displayCompany: "한성자동차㈜",
      title: "한성자동차㈜ 안성서비스센터 리셉션 채용",
      description: [
        "Mercedes-Benz Official Dealer 한성자동차㈜ 안성서비스센터 리셉션 채용입니다.",
        "",
        "담당업무",
        "· 서비스센터 내방 고객 응대 및 안내",
        "· 차량 AS 접수 및 일정 관리",
        "· 센터 문의 전화 응대 및 예약 접수",
        "· 센터 내 상품 판매 및 매출 관리",
        "",
        "채용일정",
        "· 면접일정: 2026년 8월 18일(화)~20일(목) 예정",
        "· 입사일정: 2026년 8월 24일(월) 예정",
        "· 상기 일정은 채용 상황에 따라 변경될 수 있습니다.",
        "",
        "전형절차",
        "서류검토 → 면접 → 입사",
      ].join("\n"),
      requirements: ["고객 응대 업무에 책임감 있게 임하실 수 있는 분"],
      preferredQualifications: [
        "서비스업종 및 고객 응대 경험자",
        "성실하고 밝은 성격을 보유하신 분",
        "1년 이상 근무 가능자",
      ],
      salary: "월 2,337,510원 · 월 성과 달성 시 66,700원 추가 · 연장근무/미사용 연차수당/퇴직금 별도",
      location: "경기 안성시 공도읍",
      employmentType: "제이앤씨㈜ 소속 파견계약직 · 1년",
      workSchedule: "주 5일 근무(월~금) / 격주 토요일 4시간 근무",
      workHours: "월~금 08:30~17:30 / 격주 토요일 08:00~12:00",
      breakTime: "60분",
      contractPeriod: "1년",
      conversionOpportunity: "",
      experienceLevel: "",
      educationLevel: "",
      headcount: "",
      benefits: ["유니폼 지급", ...commonBenefits],
      nearbyTransit: "",
      detailedLocation: "경기 안성시 공도읍 서동대로 3976",
      applicationDeadline: "",
    },
  },
];

async function main() {
  const resolved = [];

  for (const item of updates) {
    const ref = db.collection("jobs").doc(item.jobId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Job not found: ${item.jobId}`);
    const current = snap.data() || {};
    const identity = normalized([current.title, current.displayCompany, current.company, current.location].join(" "));
    if (current.status !== "OPEN") throw new Error(`Job is not OPEN: ${item.jobId}`);
    if (!identity.includes(normalized(item.requiredToken))) {
      throw new Error(`Identity guard failed for ${item.jobId}; expected ${item.requiredToken}`);
    }
    console.log(JSON.stringify({phase:"BEFORE",jobId:item.jobId,title:current.title,location:current.location,status:current.status}));
    resolved.push({ ref, item });
  }

  const batch = db.batch();
  for (const { ref, item } of resolved) {
    batch.update(ref, { ...item.data, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log("UPDATE_COMMITTED: 2 exact existing Hansung reception jobs updated atomically.");

  for (const { ref, item } of resolved) {
    const snap = await ref.get();
    const data = snap.data() || {};
    console.log(JSON.stringify({
      phase:"AFTER",
      jobId:item.jobId,
      title:data.title,
      location:data.location,
      detailedLocation:data.detailedLocation,
      workSchedule:data.workSchedule,
      workHours:data.workHours,
      breakTime:data.breakTime,
      contractPeriod:data.contractPeriod,
      salary:data.salary,
      status:data.status,
    }));
  }
}

main().catch((error) => {
  console.error("EXISTING_HANSUNG_UPDATE_FAILED", error);
  process.exitCode = 1;
});

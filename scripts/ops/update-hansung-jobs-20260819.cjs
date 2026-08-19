const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const apply = process.env.APPLY === "true";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");
}

function searchableText(data) {
  return normalize([
    data.company,
    data.displayCompany,
    data.title,
    data.location,
    data.detailedLocation,
    data.description,
  ].filter(Boolean).join(" "));
}

const commonBenefits = [
  "4대보험 가입",
  "퇴직금 지급",
  "연차수당 지급",
  "경조휴가 및 경조사비 지원",
  "명절선물 지급",
  "기타 회사 내규에 따름",
];

const targets = [
  {
    key: "daejeon-yuseong",
    label: "한성자동차㈜ 대전유성서비스센터 리셉션",
    tokens: ["한성자동차", "대전유성서비스센터"],
    update: {
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
    key: "anseong",
    label: "한성자동차㈜ 안성서비스센터 리셉션",
    tokens: ["한성자동차", "안성서비스센터"],
    update: {
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
  {
    key: "incheon-seogu",
    label: "한성자동차 인천서구 서비스센터 리셉션",
    tokens: ["한성자동차", "인천서구서비스센터"],
    update: {
      displayCompany: "한성자동차㈜",
      title: "한성자동차 인천서구 서비스센터 리셉션 채용",
      description: [
        "한성자동차 인천서구 서비스센터 리셉션 채용을 안내드립니다.",
        "",
        "담당업무",
        "· 서비스센터 방문 고객 응대 및 안내",
        "· 차량 AS 접수 및 일정 관리",
        "· 센터 관련 전화 문의 및 예약 접수",
        "· 센터 내 상품 문의 및 비용 안내",
        "",
        "전형절차",
        "서류전형 → 면접 → 입사",
      ].join("\n"),
      requirements: ["고객 응대 업무에 책임감 있게 임하실 수 있는 분"],
      preferredQualifications: [
        "서비스센터 및 고객응대 경험자",
        "1년 이상 근무 가능자",
      ],
      salary: "월 2,337,510원 · 월 성과 달성 시 66,700원 추가 · 연장근무/미사용 연차수당/퇴직금 별도",
      location: "인천 서구",
      employmentType: "제이앤씨㈜ 소속 파견계약직 · 1년",
      workSchedule: "주 5일 근무(월~금) / 주말·공휴일 근무 필수",
      workHours: "월~금 08:30~17:30 / 주말·공휴일 08:30~12:30",
      breakTime: "60분",
      contractPeriod: "1년",
      conversionOpportunity: "",
      experienceLevel: "",
      educationLevel: "",
      headcount: "",
      benefits: [...commonBenefits],
      nearbyTransit: "",
      detailedLocation: "인천 서구 북항로178번길 4",
      applicationDeadline: "",
    },
  },
];

async function main() {
  const snapshot = await db.collection("jobs").get();
  const openJobs = snapshot.docs
    .map((doc) => ({ id: doc.id, ref: doc.ref, data: doc.data() }))
    .filter((job) => job.data.status === "OPEN");

  console.log(`Scanned ${snapshot.size} jobs; ${openJobs.length} are OPEN.`);

  const resolved = targets.map((target) => {
    const normalizedTokens = target.tokens.map(normalize);
    const matches = openJobs.filter((job) => {
      const haystack = searchableText(job.data);
      return normalizedTokens.every((token) => haystack.includes(token));
    });

    console.log(`MATCH ${target.key}: ${matches.length}`);
    for (const match of matches) {
      console.log(JSON.stringify({
        key: target.key,
        jobId: match.id,
        title: match.data.title || "",
        displayCompany: match.data.displayCompany || match.data.company || "",
        location: match.data.location || "",
      }));
    }

    if (matches.length !== 1) {
      throw new Error(`${target.label}: expected exactly 1 OPEN job, found ${matches.length}. No writes performed.`);
    }

    return { target, match: matches[0] };
  });

  if (!apply) {
    console.log("DRY_RUN_OK: all 3 jobs resolved uniquely; APPLY is not true, so no writes were made.");
    return;
  }

  const batch = db.batch();
  for (const { target, match } of resolved) {
    batch.update(match.ref, {
      ...target.update,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log("UPDATE_COMMITTED: 3 Hansung reception jobs updated atomically.");

  for (const { target, match } of resolved) {
    const after = await match.ref.get();
    const data = after.data() || {};
    console.log(JSON.stringify({
      key: target.key,
      jobId: match.id,
      status: data.status,
      title: data.title,
      location: data.location,
      detailedLocation: data.detailedLocation,
      workSchedule: data.workSchedule,
      workHours: data.workHours,
      salary: data.salary,
    }));
  }
}

main().catch((error) => {
  console.error("HANSUNG_JOB_UPDATE_FAILED", error);
  process.exitCode = 1;
});

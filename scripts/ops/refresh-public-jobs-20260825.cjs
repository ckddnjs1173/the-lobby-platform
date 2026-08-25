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
  return String(value || "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");
}

const jobs = [
  {
    jobId: "0ZSf26gray3DmEDZr9HY",
    identityTokens: ["한성자동차", "cx", "서울서초구"],
    patch: {
      workplaceName: "한성자동차㈜",
      employingCompany: "제이앤씨㈜",
      salaryBase: "월 2,583,340원",
      salaryIncentive: "인센티브 별도",
      salaryAllowances: "수당 별도",
      workSchedule: "주 5일 스케줄 근무",
      workHours: "10:00~19:00",
      contractPeriod: "1년",
      detailedLocation: "서울 서초구 바우뫼로 207",
      experienceLevel: "경력무관",
      educationLevel: "학력무관",
    },
  },
  {
    jobId: "mM1tcG8eaqQV0w4QCqkD",
    identityTokens: ["한성자동차", "안성서비스센터", "경기안성시"],
    patch: {
      description: [
        "Mercedes-Benz Official Dealer 한성자동차㈜ 안성서비스센터 리셉션 채용입니다.",
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
      applicationDeadline: "2026-10-10",
      interviewSchedule: "",
      expectedStartDate: "",
      hiringScheduleNote: "채용 시 마감",
      experienceLevel: "경력무관",
      educationLevel: "학력무관",
      headcount: "○명",
    },
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const resolved = [];

  for (const item of jobs) {
    const ref = db.collection("jobs").doc(item.jobId);
    const snapshot = await ref.get();
    assert(snapshot.exists, `JOB_NOT_FOUND:${item.jobId}`);

    const current = snapshot.data() || {};
    assert(current.status === "OPEN", `JOB_NOT_OPEN:${item.jobId}:${current.status}`);

    const identity = normalized(
      [
        current.title,
        current.displayCompany,
        current.company,
        current.location,
        current.detailedLocation,
      ].join(" ")
    );

    for (const token of item.identityTokens) {
      assert(
        identity.includes(normalized(token)),
        `IDENTITY_GUARD_FAILED:${item.jobId}:${token}`
      );
    }

    console.log(
      "BEFORE:",
      JSON.stringify({
        jobId: item.jobId,
        title: current.title,
        status: current.status,
        workplaceName: current.workplaceName || null,
        employingCompany: current.employingCompany || null,
        salary: current.salary || null,
        salaryBase: current.salaryBase || null,
        salaryIncentive: current.salaryIncentive || null,
        salaryAllowances: current.salaryAllowances || null,
        workSchedule: current.workSchedule || null,
        workHours: current.workHours || null,
        contractPeriod: current.contractPeriod || null,
        detailedLocation: current.detailedLocation || null,
        experienceLevel: current.experienceLevel || null,
        educationLevel: current.educationLevel || null,
        applicationDeadline: current.applicationDeadline || null,
        interviewSchedule: current.interviewSchedule || null,
        expectedStartDate: current.expectedStartDate || null,
        hiringScheduleNote: current.hiringScheduleNote || null,
      })
    );

    resolved.push({ ref, item });
  }

  const batch = db.batch();
  for (const { ref, item } of resolved) {
    batch.update(ref, {
      ...item.patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log("UPDATE_COMMITTED:2 exact existing public jobs updated atomically");

  for (const { ref, item } of resolved) {
    const snapshot = await ref.get();
    const data = snapshot.data() || {};

    for (const [key, expected] of Object.entries(item.patch)) {
      assert(
        data[key] === expected,
        `READBACK_MISMATCH:${item.jobId}:${key}:${JSON.stringify(data[key])}`
      );
    }

    if (item.jobId === "mM1tcG8eaqQV0w4QCqkD") {
      assert(
        !String(data.description || "").includes("2026년 8월 18일") &&
          !String(data.description || "").includes("2026년 8월 24일"),
        "ANSEONG_STALE_SCHEDULE_STILL_IN_DESCRIPTION"
      );
    }

    console.log(
      "AFTER:",
      JSON.stringify({
        jobId: item.jobId,
        title: data.title,
        status: data.status,
        workplaceName: data.workplaceName || null,
        employingCompany: data.employingCompany || null,
        salaryBase: data.salaryBase || null,
        salaryIncentive: data.salaryIncentive || null,
        salaryAllowances: data.salaryAllowances || null,
        workSchedule: data.workSchedule || null,
        workHours: data.workHours || null,
        contractPeriod: data.contractPeriod || null,
        detailedLocation: data.detailedLocation || null,
        experienceLevel: data.experienceLevel || null,
        educationLevel: data.educationLevel || null,
        applicationDeadline: data.applicationDeadline || null,
        interviewSchedule: data.interviewSchedule || null,
        expectedStartDate: data.expectedStartDate || null,
        hiringScheduleNote: data.hiringScheduleNote || null,
      })
    );
  }

  console.log("PUBLIC_JOB_REFRESH_VERIFIED");
}

main().catch((error) => {
  console.error(
    "PUBLIC_JOB_REFRESH_FAILED",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});

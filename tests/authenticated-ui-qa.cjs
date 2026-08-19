const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = path.resolve("authenticated-ui-qa-artifacts");
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const orgId = `ui-qa-${marker}`;
const password = `LobbyQA!${marker}`;
const candidateEmail = `candidate.${marker}@example.com`;
const recruiterEmail = `recruiter.${marker}@example.com`;

const created = {
  authUids: [],
  candidateIds: [],
  jobIds: [],
  applicationIds: [],
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`MISSING_ENV:${name}`);
  return value;
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
  });
}

const auth = getAuth();
const db = getFirestore();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exchangeCustomToken(uid) {
  const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const token = await auth.createCustomToken(uid);
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, returnSecureToken: true }),
        }
      );
      const body = await response.json();
      if (response.ok && body.idToken) return body.idToken;
      lastError = new Error(`TOKEN_EXCHANGE_HTTP_${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 700));
  }

  throw lastError || new Error("TOKEN_EXCHANGE_FAILED");
}

async function callApi(token, route, method = "GET", body) {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { status: response.status, parsed, text };
}

async function seed() {
  await db.collection("organizations").doc(orgId).set({
    organizationId: orgId,
    name: "UI QA 격리 조직",
    displayName: "UI QA 격리 조직",
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const [candidateUser, recruiterUser] = await Promise.all([
    auth.createUser({ email: candidateEmail, password, displayName: "UI QA 지원자" }),
    auth.createUser({ email: recruiterEmail, password, displayName: "UI QA 리크루터" }),
  ]);
  created.authUids.push(candidateUser.uid, recruiterUser.uid);

  await db.collection("users").doc(recruiterUser.uid).set({
    uid: recruiterUser.uid,
    name: "UI QA 리크루터",
    email: recruiterEmail,
    role: "RECRUITER",
    status: "ACTIVE",
    organizationId: orgId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const candidateToken = await exchangeCustomToken(candidateUser.uid);
  const recruiterToken = await exchangeCustomToken(recruiterUser.uid);

  const profileResult = await callApi(candidateToken, "/api/candidate/me", "POST", {
    name: "박로비",
    phone: "010-4827-2026",
    headline: "프리미엄 리셉션 · VIP 고객응대 4년",
    careerSummary: "기업 리셉션과 VIP 라운지에서 방문객 응대, 회의실 운영, 내방객 예약 관리 경험을 보유하고 있습니다.",
    skills: ["VIP 응대", "리셉션 운영", "방문객 관리", "비즈니스 매너"],
    careers: [
      { companyName: "프리미엄 비즈니스 센터", role: "Receptionist", period: "2023.03 - 현재", description: "VIP 내방객 응대, 회의실 및 방문 예약 운영" },
      { companyName: "호텔 라운지", role: "Guest Relations", period: "2021.01 - 2023.02", description: "고객 안내 및 컨시어지 서비스" },
    ],
    education: [
      { schoolName: "한국서비스대학교", major: "호텔관광", degree: "학사", period: "2017 - 2021" },
    ],
  });
  assert([200, 201].includes(profileResult.status) && profileResult.parsed?.success, `CANDIDATE_PROFILE_SEED_FAILED:${profileResult.status}:${profileResult.text}`);
  const candidateId = profileResult.parsed.data.profile.candidateId;
  created.candidateIds.push(candidateId);

  const jobResult = await callApi(recruiterToken, "/api/b2b/jobs", "POST", {
    company: "UI QA 프리미엄 고객사",
    displayCompany: "글로벌 프리미엄 오피스",
    title: "Executive Lounge Receptionist",
    description: "임원 라운지 방문객 응대와 공간 운영을 담당합니다.",
    requirements: ["고객 응대 경험", "비즈니스 매너"],
    preferredQualifications: ["리셉션 또는 호텔 경력"],
    salary: "연 3,800만원 이상",
    location: "서울 강남구",
    employmentType: "정규직",
    status: "OPEN",
  });
  assert(jobResult.status === 201 && jobResult.parsed?.success, `JOB_SEED_FAILED:${jobResult.status}:${jobResult.text}`);
  const jobId = jobResult.parsed.data.jobId;
  created.jobIds.push(jobId);

  const applyResult = await callApi(candidateToken, "/api/applications/apply", "POST", { jobId });
  assert(applyResult.status === 201 && applyResult.parsed?.success, `CANDIDATE_APPLY_FAILED:${applyResult.status}:${applyResult.text}`);
  const applicationId = applyResult.parsed.data.applicationId;
  created.applicationIds.push(applicationId);

  const stageResult = await callApi(recruiterToken, `/api/applications/${encodeURIComponent(applicationId)}/stage`, "PATCH", {
    stage: "REVIEWING",
    note: "UI QA용 프로필 검토 단계",
  });
  assert(stageResult.status === 200 && stageResult.parsed?.success, `STAGE_SEED_FAILED:${stageResult.status}:${stageResult.text}`);

  const passiveResult = await callApi(recruiterToken, "/api/b2b/candidates", "POST", {
    name: "김라운지",
    phone: "010-7777-2026",
    email: `passive.${marker}@example.com`,
    headline: "호텔 프론트 · VIP 라운지 후보자",
    careerSummary: "호텔 프론트 및 고객서비스 경력 5년",
    skills: ["호텔 프론트", "VIP 서비스", "영어 응대"],
  });
  assert(passiveResult.status === 201 && passiveResult.parsed?.success, `PASSIVE_CANDIDATE_SEED_FAILED:${passiveResult.status}:${passiveResult.text}`);
  created.candidateIds.push(passiveResult.parsed.data.candidateId);

  const passiveApp = await callApi(recruiterToken, "/api/b2b/applications", "POST", {
    candidateId: passiveResult.parsed.data.candidateId,
    jobId,
  });
  assert(passiveApp.status === 201 && passiveApp.parsed?.success, `DIRECT_APP_SEED_FAILED:${passiveApp.status}:${passiveApp.text}`);
  created.applicationIds.push(passiveApp.parsed.data.applicationId);

  return { candidateUser, recruiterUser };
}

async function noHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(metrics.document <= metrics.viewport + 2 && metrics.body <= metrics.viewport + 2, `${label}:HORIZONTAL_OVERFLOW:${JSON.stringify(metrics)}`);
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function candidateJourney(browser, viewportName, viewport) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(candidateEmail);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(/\/candidate(?:$|\?)/, { timeout: 20000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1200);
  await noHorizontalOverflow(page, `${viewportName}:CANDIDATE`);
  await capture(page, `${viewportName.toLowerCase()}-candidate`);

  if (viewport.width < 1024) {
    const menu = page.getByRole("button", { name: "메뉴 열기" });
    if (await menu.isVisible().catch(() => false)) {
      await menu.click();
      await capture(page, `${viewportName.toLowerCase()}-candidate-menu`);
      await menu.click();
    }
  }
  await context.close();
}

async function b2bJourney(browser, viewportName, viewport) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/b2b-admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(recruiterEmail);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "워크스페이스 접속", exact: true }).click();
  await page.waitForURL(/\/b2b-admin(?:$|\?)/, { timeout: 20000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1200);

  const routes = [
    ["/b2b-admin", "pipeline"],
    ["/b2b-admin/candidates", "candidates"],
    ["/b2b-admin/jobs", "jobs"],
    ["/b2b-admin/analytics", "analytics"],
  ];

  for (const [route, shot] of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1100);
    await noHorizontalOverflow(page, `${viewportName}:B2B:${route}`);
    await capture(page, `${viewportName.toLowerCase()}-b2b-${shot}`);
  }

  if (viewport.width < 1024) {
    await page.goto(`${BASE_URL}/b2b-admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const menu = page.getByRole("button", { name: "관리자 메뉴 열기" });
    await menu.click();
    await capture(page, `${viewportName.toLowerCase()}-b2b-menu`);
  }
  await context.close();
}

async function cleanup() {
  const batchDeletes = [];
  for (const applicationId of created.applicationIds) {
    for (const collection of ["appEvents", "interviews", "communications"]) {
      try {
        const snapshot = await db.collection(collection).where("applicationId", "==", applicationId).get();
        for (const doc of snapshot.docs) batchDeletes.push(doc.ref);
      } catch {}
    }
    batchDeletes.push(db.collection("applications").doc(applicationId));
  }
  for (const candidateId of created.candidateIds) {
    batchDeletes.push(db.collection("profile").doc(candidateId));
    batchDeletes.push(db.collection("candidates").doc(candidateId));
  }
  for (const jobId of created.jobIds) batchDeletes.push(db.collection("jobs").doc(jobId));
  batchDeletes.push(db.collection("organizations").doc(orgId));
  for (const uid of created.authUids) {
    batchDeletes.push(db.collection("candidateAuthLinks").doc(uid));
    batchDeletes.push(db.collection("users").doc(uid));
  }

  for (let i = 0; i < batchDeletes.length; i += 300) {
    const batch = db.batch();
    for (const ref of batchDeletes.slice(i, i + 300)) batch.delete(ref);
    await batch.commit();
  }
  for (const uid of created.authUids) {
    await auth.deleteUser(uid).catch(() => {});
  }
  console.log("AUTHENTICATED_UI_QA_CLEANUP_FINISHED");
}

(async () => {
  let browser;
  try {
    await seed();
    browser = await chromium.launch({ headless: true });
    await candidateJourney(browser, "DESKTOP", { width: 1440, height: 1000 });
    await candidateJourney(browser, "MOBILE", { width: 390, height: 844 });
    await b2bJourney(browser, "DESKTOP", { width: 1440, height: 1000 });
    await b2bJourney(browser, "MOBILE", { width: 390, height: 844 });
    console.log("AUTHENTICATED_INTERNAL_UI_QA_PASSED");
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanup();
  }
})().catch((error) => {
  console.error("AUTHENTICATED_INTERNAL_UI_QA_FAILED:", error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = path.resolve("browser-qa-artifacts");
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const JOBS = [
  {
    jobId: "job-hotel",
    displayCompany: "5성급 호텔 브랜드",
    title: "호텔 프론트 · VIP 게스트 서비스",
    description: "프리미엄 고객의 체크인과 컨시어지 경험을 담당합니다.",
    requirements: ["고객 응대 경험", "원활한 커뮤니케이션"],
    preferredQualifications: ["호텔 프론트 경험", "영어 회화 가능"],
    salary: "연 3,600만원 이상",
    location: "서울 강남구",
    employmentType: "정규직",
    status: "OPEN",
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  },
  {
    jobId: "job-showroom",
    displayCompany: "수입차 공식 딜러",
    title: "프리미엄 쇼룸 리셉션",
    description: "전시장 방문 고객 안내와 예약 운영을 담당합니다.",
    requirements: ["서비스 마인드"],
    preferredQualifications: ["리셉션 경력"],
    salary: "협의",
    location: "서울 서초구",
    employmentType: "계약직",
    status: "OPEN",
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function attachPublicJobMock(page) {
  await page.route("**/api/public/jobs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: JOBS }),
    });
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  assert(
    metrics.scrollWidth <= metrics.viewport + 2 && metrics.bodyWidth <= metrics.viewport + 2,
    `${label}:HORIZONTAL_OVERFLOW:${JSON.stringify(metrics)}`
  );
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(450);
}

async function capture(page, viewportName, pageName) {
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `${viewportName.toLowerCase()}-${pageName}.png`),
    fullPage: true,
  });
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!/Firebase|identitytoolkit|ERR_NAME_NOT_RESOLVED|fetch/i.test(text)) {
        pageErrors.push(`console:${text}`);
      }
    }
  });

  await attachPublicJobMock(page);

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await waitForStablePage(page);
  assert(await page.getByRole("link", { name: "The Lobby 홈" }).isVisible(), `${name}:HOME_LOGO_MISSING`);
  assert(await page.getByRole("button", { name: "채용공고 검색" }).isVisible(), `${name}:HOME_SEARCH_MISSING`);
  assert(await page.locator('form[action="/jobs"] input[name="q"]').isVisible(), `${name}:HOME_KEYWORD_INPUT_MISSING`);
  await assertNoHorizontalOverflow(page, `${name}:HOME`);
  await capture(page, name, "home");

  if (viewport.width < 1280) {
    const menuButton = page.getByRole("button", { name: "메뉴 열기" });
    assert(await menuButton.isVisible(), `${name}:MOBILE_MENU_BUTTON_MISSING`);
    await menuButton.click();
    assert(await page.getByRole("navigation", { name: "모바일 주요 메뉴" }).isVisible(), `${name}:MOBILE_MENU_NOT_OPEN`);
    await capture(page, name, "mobile-menu");
    await page.getByRole("button", { name: "메뉴 닫기" }).click();
  }

  await page.goto(`${BASE_URL}/jobs?category=hotel&location=${encodeURIComponent("서울")}&employment=${encodeURIComponent("정규직")}`, { waitUntil: "domcontentloaded" });
  await waitForStablePage(page);
  assert(await page.getByText("호텔 프론트 · VIP 게스트 서비스").first().isVisible(), `${name}:FILTERED_JOB_NOT_VISIBLE`);
  assert(!(await page.getByText("프리미엄 쇼룸 리셉션").isVisible().catch(() => false)), `${name}:FILTER_LEAKED_UNMATCHED_JOB`);
  assert((await page.locator('select').nth(0).inputValue()) === "서울", `${name}:LOCATION_QUERY_NOT_HYDRATED`);
  await assertNoHorizontalOverflow(page, `${name}:JOBS`);
  await capture(page, name, "jobs");

  const keyword = page.locator('input[placeholder="직무, 회사, 지역 검색"]');
  await keyword.fill("호텔");
  await page.getByRole("button", { name: "채용공고 검색" }).click();
  await page.waitForTimeout(200);
  assert(new URL(page.url()).searchParams.get("q") === "호텔", `${name}:JOBS_SEARCH_URL_NOT_SYNCED`);

  const applyButton = page.getByRole("button", { name: /로그인 후 지원/ }).first();
  assert(await applyButton.isVisible(), `${name}:JOBS_ANON_APPLY_MISSING`);
  await applyButton.click();
  await page.waitForTimeout(250);
  assert(new URL(page.url()).pathname === "/login", `${name}:ANON_APPLY_DID_NOT_GO_LOGIN:${page.url()}`);

  for (const [route, screenshotName] of [
    ["/login", "login"],
    ["/register", "register"],
    ["/b2b-admin/login", "b2b-login"],
  ]) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    await waitForStablePage(page);
    await assertNoHorizontalOverflow(page, `${name}:${route}`);
    assert(await page.locator("body").isVisible(), `${name}:${route}:BODY_NOT_VISIBLE`);
    await capture(page, name, screenshotName);
  }

  if (pageErrors.length > 0) {
    throw new Error(`${name}:BROWSER_ERRORS:${pageErrors.join(" | ")}`);
  }

  console.log(`BROWSER_QA_${name}_PASSED`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await runViewport(browser, "DESKTOP", { width: 1440, height: 1000 });
    await runViewport(browser, "MOBILE", { width: 390, height: 844 });
    console.log("RELEASE_BROWSER_QA_PASSED");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error("RELEASE_BROWSER_QA_FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});

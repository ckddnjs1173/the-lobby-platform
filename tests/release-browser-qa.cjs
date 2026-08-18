const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:3000";
const ARTIFACT_DIR = path.resolve("browser-qa-artifacts");
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const JOBS = [
  { jobId: "job-hotel", displayCompany: "5성급 호텔 브랜드", title: "호텔 프론트 · VIP 게스트 서비스", description: "프리미엄 고객의 체크인과 컨시어지 경험을 담당합니다.", requirements: ["고객 응대 경험"], preferredQualifications: ["호텔 프론트 경험"], salary: "연 3,600만원 이상", location: "서울 강남구", employmentType: "정규직", status: "OPEN", createdAt: "2026-08-18T00:00:00.000Z", updatedAt: "2026-08-18T00:00:00.000Z" },
  { jobId: "job-showroom", displayCompany: "수입차 공식 딜러", title: "프리미엄 쇼룸 리셉션", description: "전시장 방문 고객 안내와 예약 운영을 담당합니다.", requirements: ["서비스 마인드"], preferredQualifications: ["리셉션 경력"], salary: "협의", location: "서울 서초구", employmentType: "계약직", status: "OPEN", createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-17T00:00:00.000Z" },
];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function attachPublicJobMock(page) { await page.route("**/api/public/jobs**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: JOBS }) })); }
async function assertNoHorizontalOverflow(page, label) { const m = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth })); assert(m.scrollWidth <= m.viewport + 2 && m.bodyWidth <= m.viewport + 2, `${label}:HORIZONTAL_OVERFLOW:${JSON.stringify(m)}`); }
async function stable(page) { await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(900); }
async function capture(page, viewportName, pageName) { await page.screenshot({ path: path.join(ARTIFACT_DIR, `${viewportName.toLowerCase()}-${pageName}.png`), fullPage: true }); }

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Firebase|identitytoolkit|ERR_NAME_NOT_RESOLVED|fetch/i.test(m.text())) errors.push(`console:${m.text()}`); });
  await attachPublicJobMock(page);

  for (const [route, shot] of [["/", "home"], ["/jobs?category=hotel&location=%EC%84%9C%EC%9A%B8&employment=%EC%A0%95%EA%B7%9C%EC%A7%81", "jobs"], ["/login", "login"], ["/register", "register"], ["/b2b-admin/login", "b2b-login"]]) {
    await page.goto(BASE_URL + route, { waitUntil: "domcontentloaded" });
    await stable(page);
    await assertNoHorizontalOverflow(page, `${name}:${route}`);
    await capture(page, name, shot);
  }

  if (viewport.width < 1280) {
    await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
    await stable(page);
    const menu = page.getByRole("button", { name: "메뉴 열기" });
    await menu.click();
    assert(await page.getByRole("navigation", { name: "모바일 주요 메뉴" }).isVisible(), `${name}:MOBILE_MENU_NOT_OPEN`);
    await capture(page, name, "mobile-menu");
  }

  if (errors.length) throw new Error(`${name}:BROWSER_ERRORS:${errors.join(" | ")}`);
  console.log(`BROWSER_QA_${name}_PASSED`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await runViewport(browser, "DESKTOP", { width: 1440, height: 1000 });
    await runViewport(browser, "MOBILE", { width: 390, height: 844 });
    console.log("RELEASE_BROWSER_QA_PASSED");
  } finally { await browser.close(); }
})().catch((error) => { console.error("RELEASE_BROWSER_QA_FAILED:", error instanceof Error ? error.message : error); process.exit(1); });

const { test, expect } = require("@playwright/test");

test("public acquisition and legal routes render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("THE LOBBY").first()).toBeVisible();

  await page.goto("/talent-pool");
  await expect(page.getByRole("heading", { name: /공고가 없어도/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /인재풀 프로필 등록/ })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "개인정보 처리방침" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "The Lobby 이용약관" })).toBeVisible();
});

test("search discovery endpoints are published", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  expect(xml).toContain("/jobs");
  expect(xml).toContain("/talent-pool");
});

test("open job detail exposes JobPosting structured data when inventory exists", async ({ page, request }) => {
  const response = await request.get("/api/public/jobs");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const jobs = Array.isArray(payload?.data) ? payload.data : [];

  test.skip(jobs.length === 0, "No OPEN job exists in the release project.");

  const job = jobs[0];
  await page.goto(`/jobs/${encodeURIComponent(job.jobId)}`);
  await expect(page.getByRole("heading", { name: job.title })).toBeVisible();

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  expect(content).toContain('"@type":"JobPosting"');
});

const { test, expect } = require("@playwright/test");

async function expectFontAtLeast(locator, minimumPx, label) {
  const fontSize = await locator.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize)
  );
  expect(fontSize, `${label} font size`).toBeGreaterThanOrEqual(minimumPx);
}

test("public mobile navigation exposes controlled state and current route", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jobs");

  const menuButton = page.getByRole("button", { name: "메뉴 열기" });
  await expect(menuButton).toHaveAttribute("aria-controls", "public-mobile-navigation");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  await menuButton.click();
  await expect(page.locator("#public-mobile-navigation")).toBeVisible();
  await expect(page.locator('#public-mobile-navigation a[aria-current="page"]')).toHaveText("채용공고");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#public-mobile-navigation")).toHaveCount(0);

  await expectFontAtLeast(
    page.getByText("Premium Reception Career Studio").first(),
    10.5,
    "public brand subtitle"
  );
});

test("job search exposes readable labels and pressed filter state", async ({ page }) => {
  await page.goto("/jobs");

  for (const [text, label] of [
    ["Open Positions", "jobs eyebrow"],
    ["키워드", "keyword label"],
    ["지역", "location label"],
    ["근무형태", "employment label"],
  ]) {
    await expectFontAtLeast(page.getByText(text, { exact: true }).first(), 10.5, label);
  }

  const allButton = page.getByRole("button", { name: "전체 보기" });
  await expect(allButton).toHaveAttribute("aria-pressed", "true");

  const corporateButton = page.getByRole("button", { name: "기업 리셉션" });
  await corporateButton.click();
  await expect(corporateButton).toHaveAttribute("aria-pressed", "true");
});

test("job search keeps empty results distinct from load failure", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByPlaceholder("직무, 회사, 지역 검색").fill("__no_matching_public_job__");
  await expect(page.getByText("조건에 맞는 공고가 없습니다.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "필터 초기화" })).toBeVisible();

  await page.route("**/api/public/jobs", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "forced browser QA failure" }),
    });
  });

  await page.goto("/jobs");
  const alert = page.getByRole("alert").filter({
    hasText: "채용공고를 불러오지 못했습니다.",
  });
  await expect(alert).toContainText("채용공고를 불러오지 못했습니다.");
  await expect(alert).toContainText("잠시 후 다시 시도해주세요.");
  await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
  await expect(page.getByText("조건에 맞는 공고가 없습니다.", { exact: true })).toHaveCount(0);
});

const { test, expect } = require("@playwright/test");

const CAREER_TRACKS = [
  ["corporate-reception", "기업 리셉션"],
  ["automotive-reception", "자동차 서비스 리셉션"],
  ["hotel-front", "호텔 프론트"],
  ["medical-reception", "메디컬 리셉션"],
  ["vip-lounge", "VIP 라운지"],
];

async function expectNoHorizontalOverflow(page, route) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(
    metrics.scrollWidth,
    `${route} horizontal overflow: ${metrics.scrollWidth}px on ${metrics.viewportWidth}px viewport`
  ).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function expectReadableTypography(page, route) {
  const violations = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("header *, main *"))
      .filter((element) => {
        if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(element.tagName)) return false;
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (!directText) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          fontSize: Number.parseFloat(style.fontSize),
        };
      })
      .filter((item) => Number.isFinite(item.fontSize) && item.fontSize < 10.5)
      .slice(0, 20);
  });

  expect(violations, `${route} has visible text below the 10.5px readability floor`).toEqual([]);
}

test("reception career hub links to all specialist guides", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByRole("heading", { level: 1, name: /리셉션 커리어를/ })).toBeVisible();

  for (const [slug, title] of CAREER_TRACKS) {
    await expect(page.locator(`a[href=\"/careers/${slug}\"]`).first()).toBeVisible();
    await expect(page.locator(`article#${slug}`)).toContainText(title);
  }
});

test("all reception career detail routes render meaningful preparation content", async ({ page }) => {
  for (const [slug, title] of CAREER_TRACKS) {
    const route = `/careers/${slug}`;
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: `${title} 커리어 가이드` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "실제 하는 일" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "하루 업무는 이렇게 이어집니다." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "이력서에는 ‘친절함’보다 사례를 남기세요." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "면접에서는 판단 순서를 설명하세요." })).toBeVisible();
    await expect(page.getByRole("link", { name: /채용공고 보기/ }).last()).toBeVisible();
    await expectReadableTypography(page, route);
  }
});

test("career guide routes stay usable at 390px mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [slug] of CAREER_TRACKS) {
    const route = `/careers/${slug}`;
    await page.goto(route);
    await expectNoHorizontalOverflow(page, route);
    await expectReadableTypography(page, route);
  }
});

test("career detail routes are published in sitemap", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();

  expect(xml).toContain("/careers");
  for (const [slug] of CAREER_TRACKS) {
    expect(xml).toContain(`/careers/${slug}`);
  }
});

const baseUrl = (
  process.env.PRODUCTION_BASE_URL || ""
)
  .trim()
  .replace(/\/$/, "");

if (!baseUrl) {
  console.error(
    "PRODUCTION_SMOKE_FAILED: PRODUCTION_BASE_URL is required"
  );
  process.exit(1);
}

const checks = [
  {
    path: "/api/health",
    validate: async (response) => {
      const body = await response.json();
      return (
        response.status === 200 &&
        body?.status === "ok" &&
        body?.service === "the-lobby-platform"
      );
    },
  },
  { path: "/", expectedStatus: 200 },
  { path: "/jobs", expectedStatus: 200 },
  { path: "/login", expectedStatus: 200 },
  { path: "/b2b-admin/login", expectedStatus: 200 },
];

async function run() {
  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    const passed = check.validate
      ? await check.validate(response)
      : response.status === check.expectedStatus;

    console.log(
      `${check.path}: ${response.status} ${passed ? "PASS" : "FAIL"}`
    );

    if (!passed) {
      throw new Error(
        `PRODUCTION_SMOKE_CHECK_FAILED: ${check.path}`
      );
    }
  }

  console.log(
    "PHASE10_PRODUCTION_SMOKE_PASSED"
  );
}

run().catch((error) => {
  console.error(
    "PHASE10_PRODUCTION_SMOKE_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );
  process.exit(1);
});

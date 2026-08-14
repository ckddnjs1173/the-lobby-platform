const {
  spawnSync,
} = require("child_process");

const nodeCommand = process.execPath;

const checks = [
  {
    name: "Phase 8 Regression Baseline",
    args: [
      "--env-file=.env.local",
      "tests/phase8-regression-check.cjs",
    ],
  },
  {
    name: "Phase 9 Analytics Performance Static",
    args: [
      "tests/phase9-analytics-performance-check.cjs",
    ],
  },
  {
    name: "Phase 9 Analytics Performance E2E",
    args: [
      "--env-file=.env.local",
      "tests/phase9-analytics-performance-e2e.cjs",
    ],
  },
];

function runCheck(check) {
  console.log("");
  console.log(
    "============================================================"
  );
  console.log("RUN:", check.name);
  console.log(
    "============================================================"
  );

  const result = spawnSync(
    nodeCommand,
    check.args,
    {
      stdio: "inherit",
      env: process.env,
      cwd: process.cwd(),
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${check.name} failed with exit code ${result.status}`
    );
  }

  console.log("PASS:", check.name);
}

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log("");
  console.log(
    "PHASE9_REGRESSION_ALL_PASSED"
  );
} catch (error) {
  console.error("");
  console.error(
    "PHASE9_REGRESSION_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );
  process.exit(1);
}

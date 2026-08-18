const {
  spawnSync,
} = require("child_process");

const nodeCommand = process.execPath;

const checks = [
  {
    name: "Phase 9 Regression Baseline",
    args: [
      "--env-file=.env.local",
      "tests/phase9-regression-check.cjs",
    ],
  },
  {
    name: "Final Frontend Backend Contract",
    args: [
      "tests/final-frontend-backend-contract-check.cjs",
    ],
  },
  {
    name: "Phase 10 Production Readiness Static",
    args: [
      "tests/phase10-production-readiness-check.cjs",
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
    "PHASE10_REGRESSION_ALL_PASSED"
  );
} catch (error) {
  console.error("");
  console.error(
    "PHASE10_REGRESSION_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );
  process.exit(1);
}

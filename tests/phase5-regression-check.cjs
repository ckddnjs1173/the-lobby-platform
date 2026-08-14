const {
  spawnSync,
} = require("child_process");

const nodeCommand =
  process.execPath;

const checks = [
  {
    name:
      "Phase 4 Regression Baseline",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/phase4-regression-check.cjs",
    ],
  },
  {
    name:
      "Phase 5 Authorized Application List API",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/application-list-api-check.cjs",
    ],
  },
];

function runCheck(check) {
  console.log("");
  console.log(
    "============================================================"
  );
  console.log(
    "RUN:",
    check.name
  );
  console.log(
    "============================================================"
  );

  const result = spawnSync(
    check.command,
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

  console.log(
    "PASS:",
    check.name
  );
}

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log("");
  console.log(
    "PHASE5_REGRESSION_ALL_PASSED"
  );
} catch (error) {
  console.error("");
  console.error(
    "PHASE5_REGRESSION_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
}

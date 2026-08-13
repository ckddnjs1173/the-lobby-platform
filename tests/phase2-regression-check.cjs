const {
  spawnSync,
} = require("child_process");

const nodeCommand =
  process.execPath;

const checks = [
  {
    name:
      "Phase 2 Application Activity",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/application-activity-check.cjs",
    ],
  },
  {
    name:
      "Phase 2 Job Management",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/job-management-check.cjs",
    ],
  },
  {
    name:
      "Phase 2 B2B Direct Application",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/b2b-direct-application-check.cjs",
    ],
  },
  {
    name:
      "Phase 2 Application Operations",
    command:
      nodeCommand,
    args: [
      "--env-file=.env.local",
      "tests/application-operations-check.cjs",
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
    "PHASE2_REGRESSION_ALL_PASSED"
  );
} catch (error) {
  console.error("");
  console.error(
    "PHASE2_REGRESSION_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
}

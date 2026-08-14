const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const checks = [
  "tests/phase5-regression-check.cjs",
  "tests/phase6-passive-candidate-atomicity-check.cjs",
  "tests/phase6-ai-intake-check.cjs",
  "tests/phase6-stage-policy-check.cjs",
  "tests/phase6-interview-lifecycle-check.cjs",
  "tests/phase6-interview-transition-check.cjs",
];

for (const relativePath of checks) {
  console.log(`RUNNING: ${relativePath}`);

  const result = spawnSync(
    process.execPath,
    [path.join(root, relativePath)],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("PHASE6_REGRESSION_ALL_PASSED");

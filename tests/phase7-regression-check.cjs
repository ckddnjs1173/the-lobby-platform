const {
  spawnSync,
} = require("child_process");

function run(file) {
  console.log(`RUNNING: ${file}`);

  const result = spawnSync(
    process.execPath,
    [file],
    {
      stdio: "inherit",
      env: process.env,
      shell: false,
    }
  );

  if (result.status !== 0) {
    process.exit(
      result.status || 1
    );
  }
}

run(
  "tests/phase6-regression-check.cjs"
);
run(
  "tests/phase7-communication-check.cjs"
);
run(
  "tests/phase7-communication-security-check.cjs"
);

console.log(
  "PHASE7_REGRESSION_ALL_PASSED"
);

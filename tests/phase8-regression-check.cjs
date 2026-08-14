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
  "tests/phase7-regression-check.cjs"
);
run(
  "tests/phase8-candidate-portal-check.cjs"
);
run(
  "tests/phase8-candidate-portal-e2e.cjs"
);

console.log(
  "PHASE8_REGRESSION_ALL_PASSED"
);

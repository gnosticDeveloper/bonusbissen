// Runs every test file in its own Bun process.
//
// Several suites replace modules or `fetch` (onboarding, billing, proxy…), and
// lib/auth/session.ts caches the public key per process, so running the whole
// tree in one `bun test` makes suites leak into each other.

const files = [...new Bun.Glob("**/*.test.{js,ts}").scanSync({ cwd: "." })]
  .filter((file) => !file.startsWith("node_modules") && !file.startsWith(".next"))
  .sort();

const failed: string[] = [];

for (const file of files) {
  const run = Bun.spawnSync(["bun", "test", `./${file}`], { stdout: "inherit", stderr: "inherit" });
  if (run.exitCode !== 0) failed.push(file);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} of ${files.length} test files failed:\n${failed.map((file) => `  - ${file}`).join("\n")}`);
  process.exit(1);
}

console.log(`\nAll ${files.length} test files passed.`);

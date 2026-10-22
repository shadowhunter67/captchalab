// CI preflight: `pnpm -r run <script>` silently skips a workspace that lacks the script, so a new
// package could escape lint/typecheck/test unnoticed. Fail if any non-exempt workspace misses one.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REQUIRED = ["lint", "typecheck", "test"];
// Config-only package: it has no code to typecheck or test, only lint.
const EXEMPT = { "@captchalab/config": ["typecheck", "test"] };

const problems = [];
let count = 0;
for (const group of ["apps", "packages", "examples"]) {
  if (!existsSync(group)) continue;
  for (const name of readdirSync(group, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const file = join(group, name.name, "package.json");
    if (!existsSync(file)) continue;
    count++;
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    for (const script of REQUIRED) {
      if (EXEMPT[pkg.name]?.includes(script)) continue;
      if (!pkg.scripts?.[script]) problems.push(`${pkg.name} (${file}) has no "${script}" script`);
    }
  }
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`workspace scripts OK (${count} packages)`);

const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const parts = pkg.version.split(".").map(Number);
if (parts.length === 3 && !parts.some(isNaN)) {
  parts[2] += 1;
  pkg.version = parts.join(".");
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`[Version Bump] Version auto-incremented to v${pkg.version}`);
} else {
  console.log(`[Version Bump] Unable to parse version string: ${pkg.version}`);
}

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const files = collectSourceFiles(path.join(repoRoot, "packages"));
let changed = 0;

for (const fileName of files) {
  const original = fs.readFileSync(fileName, "utf8");
  const updated = original.replace(
    /import type \{([\s\S]*?)\} from/g,
    (match, body) => `import type {${body.replace(/\btype\s+/g, "")}} from`,
  );

  if (updated !== original) {
    fs.writeFileSync(fileName, updated);
    changed += 1;
  }
}

console.log(`Normalized import type modifiers in ${changed} file(s).`);

function collectSourceFiles(rootDir) {
  const results = [];
  walk(rootDir, results);
  return results.filter(
    (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
  );
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") {
        continue;
      }
      walk(resolved, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(resolved);
    }
  }
}

import fs from "node:fs";
import path from "node:path";

const repoDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const localSupabaseDir = path.join(repoDir, "supabase");
const canonicalSupabaseDir = process.env.OKEYO_SUPABASE_CANONICAL_DIR
  ? path.resolve(process.env.OKEYO_SUPABASE_CANONICAL_DIR)
  : path.resolve(repoDir, "..", "travel", "infra", "supabase");

const managedEntries = [
  "functions",
  "migrations",
  "ENV_TEMPLATE.txt",
  "config.toml",
];

const ignoredBasenames = new Set([".DS_Store"]);

function walkFiles(targetPath, rootDir, collector) {
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      if (ignoredBasenames.has(entry)) {
        continue;
      }
      walkFiles(path.join(targetPath, entry), rootDir, collector);
    }
    return;
  }

  collector.push(path.relative(rootDir, targetPath));
}

function collectManagedFiles(baseDir) {
  const files = [];

  for (const entry of managedEntries) {
    const targetPath = path.join(baseDir, entry);
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    walkFiles(targetPath, baseDir, files);
  }

  return files.sort();
}

function readBuffer(filePath) {
  return fs.readFileSync(filePath);
}

function main() {
  if (!fs.existsSync(canonicalSupabaseDir)) {
    console.error(
      `Canonical Supabase directory not found: ${canonicalSupabaseDir}`,
    );
    console.error(
      "Set OKEYO_SUPABASE_CANONICAL_DIR if the shared Supabase repo lives elsewhere.",
    );
    process.exit(1);
  }

  const localFiles = collectManagedFiles(localSupabaseDir);
  const canonicalFiles = collectManagedFiles(canonicalSupabaseDir);
  const localSet = new Set(localFiles);
  const canonicalSet = new Set(canonicalFiles);
  const drift = [];

  for (const file of canonicalFiles) {
    if (!localSet.has(file)) {
      drift.push(`Missing locally: ${file}`);
      continue;
    }

    const localBuffer = readBuffer(path.join(localSupabaseDir, file));
    const canonicalBuffer = readBuffer(path.join(canonicalSupabaseDir, file));
    if (!localBuffer.equals(canonicalBuffer)) {
      drift.push(`Content mismatch: ${file}`);
    }
  }

  for (const file of localFiles) {
    if (!canonicalSet.has(file)) {
      drift.push(`Missing in canonical source: ${file}`);
    }
  }

  if (drift.length > 0) {
    console.error("Supabase drift detected between travel-web and canonical source:");
    for (const entry of drift) {
      console.error(`- ${entry}`);
    }
    process.exit(1);
  }

  console.log(
    `Supabase functions, migrations, and config are in sync with ${canonicalSupabaseDir}.`,
  );
}

main();

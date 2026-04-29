#!/usr/bin/env node
/**
 * i18n-audit.mjs
 *
 * Scans the codebase for:
 * 1. Translation keys that exist in one locale but are missing in others
 * 2. Potentially hardcoded UI text in TSX/TS files
 *
 * Usage:
 *   node scripts/i18n-audit.mjs
 */

import { readdirSync, readFileSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = resolve(process.cwd());
const LOCALES_DIR = join(ROOT, "src/locales");
const SCAN_DIRS = [join(ROOT, "src/app"), join(ROOT, "src/components")];

/* ────────────────────────────── Colors ─────────────────────────────── */
const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

/* ─────────────────────────── Utilities ─────────────────────────────── */
function getFiles(dir, ext) {
  const files = [];
  try {
    const relDir = relative(ROOT, dir);
    const entries = readdirSync(relDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(ext)) {
        files.push(join(ROOT, entry.parentPath ?? ".", entry.name));
      }
    }
  } catch {
    // directory might not exist
  }
  return files;
}

function flattenKeys(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const child of flattenKeys(v, path)) keys.add(child);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function stripJsxComments(text) {
  return text.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

/* ──────────────────────────── Auditors ─────────────────────────────── */

function auditMissingKeys() {
  const localeFiles = readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f.replace(".json", ""),
      path: join(LOCALES_DIR, f),
    }));

  if (localeFiles.length < 2) {
    console.log(`${C.yellow}Only one locale file found, skipping key comparison.${C.reset}\n`);
    return [];
  }

  const localeKeys = new Map();
  for (const { name, path } of localeFiles) {
    const content = JSON.parse(readFileSync(path, "utf-8"));
    localeKeys.set(name, flattenKeys(content));
  }

  const allKeys = new Set();
  for (const keys of localeKeys.values()) {
    for (const k of keys) allKeys.add(k);
  }

  const issues = [];
  for (const key of allKeys) {
    const missingIn = [];
    for (const [name, keys] of localeKeys) {
      if (!keys.has(key)) missingIn.push(name);
    }
    if (missingIn.length > 0) {
      issues.push({ key, missingIn });
    }
  }

  return issues;
}

const ALLOWLIST = new Set([
  // CSS / layout
  "flex", "block", "inline", "inline-block", "grid", "none", "auto", "hidden",
  "absolute", "relative", "fixed", "sticky", "static", "contents",
  // Sizes
  "sm", "md", "lg", "xl", "2xl", "xs",
  // Variants / UI
  "primary", "secondary", "destructive", "outline", "ghost", "link", "default",
  "muted", "accent", "popover", "card", "background", "foreground", "border",
  "danger", "warning", "success", "info",
  // Shadcn / Tailwind common
  "top", "bottom", "left", "right", "center", "start", "end",
  "row", "col", "column", "wrap", "nowrap",
  // HTML / ARIA
  "true", "false", "null", "undefined", "button", "submit", "reset",
  // Misc safe
  "&nbsp;", "&amp;", "&lt;", "&gt;", "&quot;",
  "div", "span", "p", "section", "main", "header", "footer", "article", "aside", "nav",
  // Common attributes
  "lazy", "eager", "anonymous", "use-credentials",
  // Date-fns tokens
  "yyyy", "MM", "dd", "HH", "mm", "ss",
]);

const JSX_TAG_RE = />((?:[^<]|\{(?:[^}]|\}[^<])*\})*?)</g;
const JSX_EXPR_STRING_RE = /\{\s*["']([^"']{2,})["']\s*\}/g;
const FALLBACK_STRING_RE = /\?\?\s*["']([^"']{2,})["']/g;
const OR_STRING_RE = /\|\|\s*["']([^"']{2,})["']/g;

function isExpressionOnly(str) {
  // {description}, {children}, {error.message}, {dateStr}, {uploadProgress}%, etc.
  return /^\s*\{/.test(str);
}

function looksLikeCode(str) {
  const trimmed = str.trim();
  // Contains function calls or assignment
  if (/[()=]/.test(trimmed)) return true;
  // Starts with & (type intersections or entities we didn't allowlist)
  if (/^&/.test(trimmed)) return true;
  // Template expression
  if (/\$\{/.test(trimmed)) return true;
  // URL
  if (/^https?:\/\//.test(trimmed)) return true;
  // Logical/bitwise operators (code)
  if (/\|\||&&/.test(trimmed)) return true;
  // Type unions with |
  if (/ \| /.test(trimmed) || /^\|/.test(trimmed)) return true;
  // Path/timezone-like identifiers (e.g. Africa/Casablanca)
  if (/\//.test(trimmed) && !/\s/.test(trimmed)) return true;
  // Enum-like value (snake_case without spaces, no accents)
  if (/^[a-z][a-z0-9_]*$/.test(trimmed) && !/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(trimmed)) return true;
  return false;
}

function looksLikeCss(str) {
  const trimmed = str.trim();
  if (!/\s/.test(trimmed)) return false; // single word is not a CSS class list
  const cssPatterns = /\b(flex|grid|block|inline|hidden|items|justify|gap|p-|m-|w-|h-|rounded|text-|bg-|border|shadow|col-|row-|static|fixed|sticky|absolute|relative)\b/;
  return cssPatterns.test(trimmed) && !/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(trimmed);
}

function looksLikeNaturalLanguage(str) {
  const trimmed = str.trim();
  if (trimmed.length < 2) return false;
  if (/^\d+([,.]\d+)?$/.test(trimmed)) return false;
  if (/^[\d\s\W]+$/.test(trimmed)) return false;
  if (ALLOWLIST.has(trimmed.toLowerCase())) return false;
  if (ALLOWLIST.has(trimmed)) return false;
  if (isExpressionOnly(trimmed)) return false;
  if (looksLikeCode(trimmed)) return false;
  if (looksLikeCss(trimmed)) return false;

  const hasLetters = /[a-zA-Z]/.test(trimmed);
  const hasSpace = /\s/.test(trimmed);
  const hasAccent = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]/.test(trimmed);
  const isLong = trimmed.length > 8;

  return hasLetters && (hasSpace || hasAccent || isLong);
}

function auditHardcodedText() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    files.push(...getFiles(dir, ".tsx"));
    // .ts files rarely contain JSX; skip them to reduce noise
  }

  const issues = [];

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf-8");
    const lines = raw.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      let line = lines[i];

      // Skip imports and comments
      if (/^\s*import\s/.test(line)) continue;
      if (/^\s*\/\//.test(line)) continue;

      // Skip lines that already use t( with a string argument
      if (/t\(\s*["']/.test(line)) continue;
      if (/useT\(\)/.test(line)) continue;
      if (/useSiteI18n/.test(line)) continue;

      // Remove JSX comments from line before scanning
      line = stripJsxComments(line);

      // Check JSX text nodes: >...<
      let m;
      while ((m = JSX_TAG_RE.exec(line)) !== null) {
        const text = m[1];
        if (looksLikeNaturalLanguage(text)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNum,
            type: "JSX text",
            text: text.trim(),
          });
        }
      }
      JSX_TAG_RE.lastIndex = 0;

      // Check string literals inside JSX expressions: { "..." }
      while ((m = JSX_EXPR_STRING_RE.exec(line)) !== null) {
        const text = m[1];
        if (looksLikeNaturalLanguage(text)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNum,
            type: "JSX expression string",
            text: text.trim(),
          });
        }
      }
      JSX_EXPR_STRING_RE.lastIndex = 0;

      // Check fallback strings: ?? "..."
      while ((m = FALLBACK_STRING_RE.exec(line)) !== null) {
        const text = m[1];
        if (looksLikeNaturalLanguage(text)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNum,
            type: "fallback string",
            text: text.trim(),
          });
        }
      }
      FALLBACK_STRING_RE.lastIndex = 0;

      // Check OR fallback strings: || "..."
      while ((m = OR_STRING_RE.exec(line)) !== null) {
        const text = m[1];
        if (looksLikeNaturalLanguage(text)) {
          issues.push({
            file: relative(ROOT, filePath),
            line: lineNum,
            type: "fallback string",
            text: text.trim(),
          });
        }
      }
      OR_STRING_RE.lastIndex = 0;
    }
  }

  return issues;
}

/* ──────────────────────────── Report ───────────────────────────────── */

function report() {
  let exitCode = 0;

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║           i18n Audit Report                          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════╝${C.reset}\n`);

  // 1. Missing keys
  const missing = auditMissingKeys();
  if (missing.length === 0) {
    console.log(`${C.green}✓ All translation keys are present in every locale file.${C.reset}\n`);
  } else {
    exitCode = 1;
    console.log(`${C.bold}${C.red}Missing translation keys (${missing.length}):${C.reset}`);
    for (const { key, missingIn } of missing) {
      console.log(`  ${C.yellow}• ${key}${C.reset} ${C.gray}(missing in: ${missingIn.join(", ")})${C.reset}`);
    }
    console.log();
  }

  // 2. Hardcoded text
  const hardcoded = auditHardcodedText();
  if (hardcoded.length === 0) {
    console.log(`${C.green}✓ No hardcoded UI text detected.${C.reset}\n`);
  } else {
    exitCode = 1;
    console.log(`${C.bold}${C.red}Potentially hardcoded text (${hardcoded.length}):${C.reset}`);

    const byFile = new Map();
    for (const issue of hardcoded) {
      if (!byFile.has(issue.file)) byFile.set(issue.file, []);
      byFile.get(issue.file).push(issue);
    }

    for (const [file, issues] of byFile) {
      console.log(`\n  ${C.bold}${C.blue}${file}${C.reset}`);
      for (const issue of issues) {
        console.log(`    ${C.gray}L${issue.line}${C.reset} [${C.magenta}${issue.type}${C.reset}] ${C.yellow}"${issue.text}"${C.reset}`);
      }
    }
    console.log();
  }

  // Summary
  if (exitCode === 0) {
    console.log(`${C.green}${C.bold}✓ i18n audit passed!${C.reset}\n`);
  } else {
    console.log(`${C.yellow}${C.bold}⚠ i18n audit found issues. Please review above.${C.reset}\n`);
  }

  process.exit(exitCode);
}

report();

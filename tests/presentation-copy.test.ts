import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const readmeExpectations = [
  { file: "README.md", phrase: "six frontier systems plus the dedicated PTD Home base", screenshotDir: "docs/screenshots" },
  { file: "README.zh-CN.md", phrase: "六大前线星系 + PTD Home 专用据点", screenshotDir: "docs/screenshots/zh-CN" },
  { file: "README.zh-TW.md", phrase: "六大前線星系 + PTD Home 專用據點", screenshotDir: "docs/screenshots/zh-TW" },
  { file: "README.ja.md", phrase: "6つの辺境星系と専用拠点 PTD Home", screenshotDir: "docs/screenshots/ja" },
  { file: "README.fr.md", phrase: "six systèmes frontaliers plus la base dédiée PTD Home", screenshotDir: "docs/screenshots/fr" }
] as const;

const staleCopyPatterns = [
  /six-system frontier/i,
  /push across a six-system/i,
  /The fleet has five distinct GLB silhouettes/,
  /舰队包含五种不同的 GLB 轮廓/,
  /艦隊包含五種不同的 GLB 輪廓/,
  /艦隊には 5 種類の GLB シルエット/,
  /La flotte compte cinq silhouettes GLB distinctes/,
  /eight-step mission chain/,
  /八步任务链/,
  /八步任務鏈/,
  /8 段階のミッションチェーン/,
  /chaine de huit missions/
];

const screenshotNames = [
  "main-menu.png",
  "flight-hud.png",
  "station-market.png",
  "galaxy-map.png",
  "shipyard-careers.png"
] as const;

const screenshotPaths = readmeExpectations.flatMap((item) => screenshotNames.map((name) => `${item.screenshotDir}/${name}`));

function readProjectFile(path: string): string {
  return readFileSync(resolve(rootDir, path), "utf8");
}

function readPngDimensions(path: string): { width: number; height: number } {
  const buffer = readFileSync(resolve(rootDir, path));
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

describe("presentation copy", () => {
  it("keeps public system and feature copy aligned with the canonical showcase pitch", () => {
    const files = [
      ...readmeExpectations.map((item) => item.file),
      "src/components/MainMenu.tsx",
      "src/i18n/index.ts"
    ];
    const combined = files.map(readProjectFile).join("\n");

    for (const pattern of staleCopyPatterns) {
      expect(combined).not.toMatch(pattern);
    }

    for (const { file, phrase, screenshotDir } of readmeExpectations) {
      const readme = readProjectFile(file);
      expect(readme).toContain(phrase);
      for (const screenshotName of screenshotNames) {
        expect(readme).toContain(`${screenshotDir}/${screenshotName}`);
      }
    }
    expect(readProjectFile("src/components/MainMenu.tsx")).toContain("six frontier systems plus PTD Home");
  });

  it("keeps README screenshot assets present, non-empty, and consistently sized", () => {
    for (const screenshotPath of screenshotPaths) {
      const absolutePath = resolve(rootDir, screenshotPath);
      expect(existsSync(absolutePath), `${screenshotPath} missing`).toBe(true);
      expect(statSync(absolutePath).size, `${screenshotPath} is unexpectedly small`).toBeGreaterThan(8_000);
      expect(readPngDimensions(screenshotPath), `${screenshotPath} dimensions`).toEqual({ width: 1440, height: 900 });
    }
  });
});

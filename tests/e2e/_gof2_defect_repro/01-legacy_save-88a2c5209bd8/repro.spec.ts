import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Self-contained, LLM-independent reproduction of a GOF2 deep-state defect found
// by C3 state-fuzzing. It replays the EXACT captured state through the game's own
// paths and asserts the app does NOT crash/blank. It is a REGRESSION test: it FAILS
// on the current build (bug reproduced) and PASSES once the app sanitizes the state
// / adds a top-level ErrorBoundary. Run via ../reproduce.sh.

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, "state.json"), "utf-8"));
const recipe = fixture.repro;
const CRASH = /Computed radius is NaN|LineSegmentsGeometry|computeBoundingSphere|error occurred in the <|error boundary|\bNaN\b/i;

test(`GOF2 defect [${fixture.injection_mode}] ${fixture.fingerprint ?? ""}`.trim(), async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.addInitScript((ls) => {
    for (const k of (ls.clear ?? [])) localStorage.removeItem(k as string);
    for (const [k, v] of Object.entries(ls.values ?? {})) localStorage.setItem(k as string, v as string);
  }, { values: recipe.local_storage, clear: recipe.clear_keys });

  await page.goto("/?warptest=1");
  await page.waitForFunction(() => typeof (window as any).__GOF2_E2E__?.getState === "function", null, { timeout: 30000 });

  if (recipe.family === "load") {
    // Drive the game's OWN save loader -- the production save-restore path.
    const loaded = await page.evaluate((slot) => {
      const store = (window as any).__GOF2_E2E__.getState();
      store.stopEconomyStream?.();
      const ok = store.loadGame ? store.loadGame(slot ?? undefined) : false;
      (window as any).__GOF2_E2E__.getState().closeDialogue?.();
      return ok === undefined ? true : ok;
    }, recipe.load_slot ?? null);
    expect(loaded, "loadGame() accepted the save (normalizeSave passed) - so any crash below is a render-time defect").toBeTruthy();
  } else if (recipe.family === "memory") {
    await page.evaluate(() => {
      const s = (window as any).__GOF2_E2E__.getState();
      s.newGame?.(); s.closeDialogue?.(); s.stopEconomyStream?.();
    });
    await page.waitForTimeout(300);
    await page.evaluate(({ save, replace }) => {
      const hook = (window as any).__GOF2_E2E__;
      hook.getState().stopEconomyStream?.();
      hook.getState().closeDialogue?.();
      hook.setState(save, replace === true);
    }, { save: recipe.setState_save, replace: recipe.replace });
  } else if (recipe.family === "action") {
    await page.evaluate(() => {
      const s = (window as any).__GOF2_E2E__.getState();
      s.newGame?.(); s.closeDialogue?.(); s.stopEconomyStream?.();
    });
    await page.waitForTimeout(300);
    await page.evaluate((actions) => {
      const hook = (window as any).__GOF2_E2E__;
      for (const a of (actions ?? [])) {
        if (!a || typeof a !== "object") continue;
        const fn = hook.getState()[a.method];
        if (typeof fn !== "function") continue;
        try { fn(...(Array.isArray(a.args) ? a.args : [])); } catch (e) { /* keep going */ }
      }
      hook.getState().closeDialogue?.();
    }, recipe.actions);
  }

  await page.waitForTimeout(800);
  await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});

  const rootChildren = await page.evaluate(() => document.getElementById("root")?.childElementCount ?? 0);
  const crashed =
    pageErrors.some((e) => CRASH.test(e)) ||
    consoleErrors.some((e) => CRASH.test(e)) ||
    rootChildren === 0;

  console.log("== GOF2 defect repro ==");
  console.log("injection_mode:", fixture.injection_mode, "operator:", fixture.operator_id, "defect_type:", fixture.defect_type);
  console.log("#root childElementCount:", rootChildren);
  console.log("pageErrors:", JSON.stringify(pageErrors.slice(0, 3)));
  console.log("consoleErrors:", JSON.stringify(consoleErrors.slice(0, 5)));

  expect(crashed, "app crashed/blanked on the injected deep-state (see logs above for the captured errors)").toBe(false);
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  formatCargoLabel,
  formatCredits,
  formatDateTime,
  formatDistance,
  formatGameDuration,
  formatNumber,
  formatRuntimeText,
  formatTechLevel,
  hasExactTranslation,
  localeOptions,
  locales,
  localizeCombatAiProfile,
  localizeCombatLoadout,
  localizeCommodityName,
  localizeEquipmentName,
  localizeFactionName,
  localizeMarketTag,
  localizePlanetName,
  localizeShipName,
  localizeStationArchetype,
  localizeStationName,
  localizeSystemName,
  normalizeLocale,
  speechLangForLocale,
  t,
  translateText
} from "../src/i18n";
import { commodities, equipmentList, factionNames, planets, ships, stations, systems } from "../src/data/world";
import { combatAiProfileLabels } from "../src/systems/combatAi";
import { combatLoadoutLabels } from "../src/systems/combatDoctrine";

describe("i18n", () => {
  it("uses English as the default locale and recognizes every supported locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(locales).toEqual(["en", "zh-CN", "zh-TW", "ja", "fr"]);
    expect(localeOptions.map((option) => option.label)).toEqual(["English", "简体中文", "繁體中文", "日本語", "Français"]);
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLocale("bad-locale")).toBe("en");
  });

  it("formats language-specific strings, numbers, dates, and durations", () => {
    expect(t("zh-CN", "language.label")).toBe("语言");
    expect(t("fr", "language.current", { language: "Français" })).toBe("Langue : Français");
    expect(formatNumber("fr", 1234567)).toContain("1");
    expect(formatDateTime("ja", "2026-01-02T03:04:00.000Z")).toMatch(/\d/);
    expect(formatGameDuration("zh-TW", 125)).toBe("2分05秒");
  });

  it("translates representative UI, runtime, and content text for every non-English locale", () => {
    for (const locale of ["zh-CN", "zh-TW", "ja", "fr"] as const) {
      expect(speechLangForLocale(locale)).not.toBe("en-US");
      expect(hasExactTranslation("New Game", locale)).toBe(true);
      expect(translateText("Game saved to auto.", locale)).not.toBe("Game saved to auto.");
      expect(translateText("Tech Level 3", locale)).not.toBe("Tech Level 3");
      expect(translateText("Cargo hold full.", locale)).not.toBe("Cargo hold full.");
      expect(translateText("Primary Weapon · Station Signal", locale)).not.toBe("Primary Weapon · Station Signal");
    }
  });

  it("provides localized display names for core content IDs in every non-English locale", () => {
    for (const locale of ["zh-CN", "zh-TW", "ja", "fr"] as const) {
      for (const commodity of commodities) expect(localizeCommodityName(commodity.id, locale, commodity.name)).not.toBe(commodity.name);
      for (const equipment of equipmentList) expect(localizeEquipmentName(equipment.id, locale, equipment.name)).not.toBe(equipment.name);
      for (const ship of ships) expect(localizeShipName(ship.id, locale, ship.name)).not.toBe(ship.name);
      for (const [id, name] of Object.entries(factionNames)) expect(localizeFactionName(id, locale, name)).not.toBe(name);
      for (const system of systems) expect(localizeSystemName(system.id, locale, system.name)).not.toBe(system.name);
      for (const planet of planets) expect(localizePlanetName(planet.id, locale, planet.name)).not.toBe(planet.name);
      for (const station of stations) {
        expect(localizeStationName(station.id, locale, station.name)).not.toBe(station.name);
        expect(localizeStationArchetype(station.archetype, locale)).not.toBe(station.archetype);
      }
      for (const [id, label] of Object.entries(combatAiProfileLabels)) expect(localizeCombatAiProfile(id, locale, label)).not.toBe(label);
      for (const [id, label] of Object.entries(combatLoadoutLabels)) expect(localizeCombatLoadout(id, locale, label)).not.toBe(label);
      for (const tag of ["Export", "Import", "Scarce", "Balanced"]) expect(localizeMarketTag(tag, locale)).not.toBe(tag);
    }
  });

  it("does not leave screenshot English residue in Simplified Chinese formatted output", () => {
    const zhOutput = [
      formatCredits("zh-CN", 1500),
      formatCargoLabel("zh-CN", 5, 18),
      formatTechLevel("zh-CN", 2, true),
      formatDistance("zh-CN", 72),
      formatRuntimeText("zh-CN", "Pirates are sizing you up · weapons free in 1s"),
      formatRuntimeText("zh-CN", "Economy offline · local fallback"),
      formatRuntimeText("zh-CN", "MINING · Iron"),
      localizeCommodityName("basic-food", "zh-CN", "Basic Food"),
      localizeCommodityName("drinking-water", "zh-CN", "Drinking Water"),
      localizeFactionName("solar-directorate", "zh-CN", "Solar Directorate"),
      localizeCombatAiProfile("law-patrol", "zh-CN", "Law Patrol"),
      localizeCombatLoadout("directorate-patrol", "zh-CN", "Directorate precision kit"),
      localizeShipName("sparrow-mk1", "zh-CN", "Sparrow MK-I"),
      localizeStationName("helion-prime", "zh-CN", "Helion Prime Exchange"),
      localizeMarketTag("Export", "zh-CN"),
      localizeMarketTag("Import", "zh-CN"),
      localizeMarketTag("Balanced", "zh-CN")
    ].join(" ");

    expect(zhOutput).not.toMatch(/Credits|Cargo|Missiles|Throttle|Speed|Patrol support active|Nearest station|Basic Food|Solar Directorate|Law Patrol|Target Hull|TECH|Helion Prime Exchange|Export|Import|Balanced/);
  });
});

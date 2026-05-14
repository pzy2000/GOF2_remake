import type { GraphicsQuality, GraphicsSettings } from "../types/game";

export const GRAPHICS_SETTINGS_KEY = "gof2-by-pzy-graphics-settings";

export const graphicsQualityLabels: Record<GraphicsQuality, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  ultra: "Ultra"
};

export const graphicsQualityProfiles: Record<GraphicsQuality, GraphicsSettings> = {
  low: {
    quality: "low",
    dprRange: [0.85, 1],
    postProcessing: false,
    bloomMultiplier: 0,
    sharpenMultiplier: 0,
    depthOfField: false,
    shadows: false
  },
  medium: {
    quality: "medium",
    dprRange: [1, 1.35],
    postProcessing: true,
    bloomMultiplier: 0.55,
    sharpenMultiplier: 0.65,
    depthOfField: false,
    shadows: false
  },
  high: {
    quality: "high",
    dprRange: [1.15, 1.7],
    postProcessing: true,
    bloomMultiplier: 0.85,
    sharpenMultiplier: 0.9,
    depthOfField: false,
    shadows: true
  },
  ultra: {
    quality: "ultra",
    dprRange: [1.25, 2],
    postProcessing: true,
    bloomMultiplier: 1,
    sharpenMultiplier: 1.15,
    depthOfField: false,
    shadows: true
  }
};

function storage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === "low" || value === "medium" || value === "high" || value === "ultra";
}

export function getGraphicsSettings(): GraphicsSettings {
  const raw = storage()?.getItem(GRAPHICS_SETTINGS_KEY);
  if (!raw) return graphicsQualityProfiles.high;
  try {
    const parsed = JSON.parse(raw) as { quality?: unknown };
    return isGraphicsQuality(parsed.quality) ? graphicsQualityProfiles[parsed.quality] : graphicsQualityProfiles.high;
  } catch {
    return graphicsQualityProfiles.high;
  }
}

export function saveGraphicsQuality(quality: GraphicsQuality): GraphicsSettings {
  const next = graphicsQualityProfiles[quality];
  storage()?.setItem(GRAPHICS_SETTINGS_KEY, JSON.stringify({ quality }));
  return next;
}

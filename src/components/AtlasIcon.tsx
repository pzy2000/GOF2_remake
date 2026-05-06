import type { CSSProperties } from "react";
import type { AssetManifest } from "../types/game";
import type { AtlasIconDefinition } from "../data/iconAtlas";
import { getAtlasBackgroundSize, getAtlasPosition } from "../data/iconAtlas";

interface AtlasIconProps {
  icon: AtlasIconDefinition;
  manifest: AssetManifest;
  size?: number;
  className?: string;
}

const atlasPath = {
  commodity: "commodityIcons",
  equipment: "equipmentIcons",
  faction: "factionEmblems"
} as const;

export function AtlasIcon({ icon, manifest, size = 44, className = "" }: AtlasIconProps) {
  const style = {
    "--icon-size": `${size}px`,
    backgroundImage: `url(${manifest[atlasPath[icon.atlas]]})`,
    backgroundPosition: getAtlasPosition(icon.index, icon.columns, icon.rows),
    backgroundSize: getAtlasBackgroundSize(icon.columns, icon.rows)
  } as CSSProperties;

  return <span className={`atlas-icon atlas-icon-${icon.atlas} ${className}`.trim()} style={style} role="img" aria-label={icon.label} title={icon.label} />;
}

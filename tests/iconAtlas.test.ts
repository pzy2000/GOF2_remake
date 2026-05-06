import { describe, expect, it } from "vitest";
import { getAtlasBackgroundSize, getAtlasPosition, getCommodityIcon, getEquipmentIcon, getFactionIcon } from "../src/data/iconAtlas";

describe("icon atlas slicing", () => {
  it("calculates stable background positions for grid cells", () => {
    expect(getAtlasPosition(0, 4, 4)).toBe("0.0000% 0.0000%");
    expect(getAtlasPosition(5, 4, 4)).toBe("33.3333% 33.3333%");
    expect(getAtlasPosition(15, 4, 4)).toBe("100.0000% 100.0000%");
    expect(getAtlasBackgroundSize(4, 3)).toBe("400% 300%");
  });

  it("resolves commodity, equipment, and faction icons", () => {
    expect(getCommodityIcon("electronics")).toMatchObject({ atlas: "commodity", index: 2, columns: 4, rows: 4 });
    expect(getEquipmentIcon("mining-beam")).toMatchObject({ atlas: "equipment", index: 3, columns: 4, rows: 3 });
    expect(getFactionIcon("independent-pirates")).toMatchObject({ atlas: "faction", index: 4, columns: 3, rows: 2 });
  });

  it("uses stable fallbacks for ids outside the atlas prompt order", () => {
    expect(getCommodityIcon("voidglass")).toMatchObject({ atlas: "commodity", index: 15 });
    expect(getEquipmentIcon("unknown-tool")).toMatchObject({ atlas: "equipment", index: 7 });
    expect(getFactionIcon("mystery-faction")).toMatchObject({ atlas: "faction", index: 5 });
  });
});

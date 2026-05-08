import { describe, expect, it } from "vitest";
import type { StationTab } from "../src/types/game";

describe("station tabs", () => {
  it("includes the economy cockpit as a valid station tab", () => {
    const tabs = ["Market", "Economy", "Hangar", "Shipyard", "Mission Board", "Captain's Log", "Blueprint Workshop", "Lounge", "Galaxy Map"] satisfies StationTab[];
    expect(tabs).toContain("Economy");
  });
});

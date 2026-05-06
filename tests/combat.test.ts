import { describe, expect, it } from "vitest";
import { applyDamage, regenerateShield } from "../src/systems/combat";

describe("combat", () => {
  it("applies shield damage before hull damage", () => {
    const result = applyDamage({ hull: 100, shield: 30, lastDamageAt: 0 }, 45, 12);
    expect(result.shield).toBe(0);
    expect(result.hull).toBe(85);
    expect(result.lastDamageAt).toBe(12);
  });

  it("regenerates shields after the delay", () => {
    const delayed = regenerateShield({ hull: 100, shield: 20, lastDamageAt: 10 }, 50, 13, 1);
    expect(delayed.shield).toBe(20);
    const recovered = regenerateShield({ hull: 100, shield: 20, lastDamageAt: 10 }, 50, 16, 1, 10);
    expect(recovered.shield).toBe(30);
  });
});

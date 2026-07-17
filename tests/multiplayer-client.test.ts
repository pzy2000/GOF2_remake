import { describe, expect, it } from "vitest";
import { resolveMultiplayerServiceConfig } from "../src/systems/multiplayerClient";

describe("multiplayer service configuration", () => {
  it("hard-disables all multiplayer transport for the Android distribution", () => {
    expect(resolveMultiplayerServiceConfig({
      envUrl: "https://multiplayer.example.com",
      production: true,
      pageProtocol: "https:",
      staticDisabled: true
    })).toMatchObject({
      enabled: false,
      displayUrl: "multiplayer disabled",
      disabledReason: "Multiplayer server disabled for static build."
    });
  });
});

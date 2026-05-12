import { describe, expect, it } from "vitest";
import { resolveEconomyServiceConfig } from "../src/systems/economyClient";

describe("economy service configuration", () => {
  it("disables the backend for static production builds without an API URL", () => {
    expect(resolveEconomyServiceConfig({ production: true, pageProtocol: "https:" })).toMatchObject({
      enabled: false,
      displayUrl: "static economy fallback",
      disabledReason: "Economy backend disabled for static build."
    });
  });

  it("uses the same-origin economy API in development", () => {
    expect(resolveEconomyServiceConfig({ production: false, pageProtocol: "http:" })).toMatchObject({
      enabled: true,
      requestBaseUrl: "",
      displayUrl: "/api/economy"
    });
  });

  it("disables insecure configured API URLs on HTTPS pages", () => {
    expect(resolveEconomyServiceConfig({
      envUrl: "http://pzy2000.github.io:19777",
      production: true,
      pageProtocol: "https:"
    })).toMatchObject({
      enabled: false,
      displayUrl: "static economy fallback",
      disabledReason: "Economy backend disabled: HTTPS pages cannot call an HTTP economy service."
    });
  });

  it("allows configured HTTPS API URLs on HTTPS pages", () => {
    expect(resolveEconomyServiceConfig({
      envUrl: "https://economy.example.com/",
      production: true,
      pageProtocol: "https:"
    })).toMatchObject({
      enabled: true,
      requestBaseUrl: "https://economy.example.com",
      displayUrl: "https://economy.example.com"
    });
  });
});

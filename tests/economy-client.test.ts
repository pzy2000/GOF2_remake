import { describe, expect, it } from "vitest";
import { resolveEconomyServiceConfig } from "../src/systems/economyClient";

describe("economy service configuration", () => {
  it("disables the backend for HTTPS production builds without an API URL", () => {
    expect(resolveEconomyServiceConfig({ production: true, pageProtocol: "https:" })).toMatchObject({
      enabled: false,
      displayUrl: "static economy fallback",
      disabledReason: "Economy backend disabled for static build."
    });
  });

  it("disables the backend when static fallback is explicitly requested", () => {
    expect(resolveEconomyServiceConfig({
      production: true,
      pageProtocol: "http:",
      pageHostname: "127.0.0.1",
      staticFallback: true
    })).toMatchObject({
      enabled: false,
      displayUrl: "static economy fallback",
      disabledReason: "Economy backend disabled for static build."
    });
  });

  it("uses the local economy backend for HTTP production builds without an API URL", () => {
    expect(resolveEconomyServiceConfig({
      production: true,
      pageProtocol: "http:",
      pageHostname: "127.0.0.1"
    })).toMatchObject({
      enabled: true,
      requestBaseUrl: "http://127.0.0.1:19777",
      displayUrl: "http://127.0.0.1:19777"
    });
  });

  it("uses the current page host for local HTTP production deployments", () => {
    expect(resolveEconomyServiceConfig({
      production: true,
      pageProtocol: "http:",
      pageHostname: "192.168.1.25"
    })).toMatchObject({
      enabled: true,
      requestBaseUrl: "http://192.168.1.25:19777",
      displayUrl: "http://192.168.1.25:19777"
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

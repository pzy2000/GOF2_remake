import { describe, expect, it } from "vitest";
import {
  getMultiplayerSettings,
  MULTIPLAYER_SETTINGS_KEY,
  saveMultiplayerNetworkMode
} from "../src/systems/multiplayerClient";
import {
  MULTIPLAYER_CREDENTIALS_STORAGE_KEY,
  readMultiplayerCredentials,
  saveMultiplayerCredentials
} from "../src/systems/multiplayerCredentials";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("multiplayer credentials", () => {
  it("persists username, callsign, and password for the login form", () => {
    const storage = new MemoryStorage();

    saveMultiplayerCredentials({ username: "pilot-a", password: "pass1234", displayName: "Pilot A" }, storage);

    expect(storage.getItem(MULTIPLAYER_CREDENTIALS_STORAGE_KEY)).toBe("{\"username\":\"pilot-a\",\"password\":\"pass1234\",\"displayName\":\"Pilot A\"}");
    expect(readMultiplayerCredentials(storage)).toEqual({
      username: "pilot-a",
      password: "pass1234",
      displayName: "Pilot A"
    });
  });

  it("falls back to blank fields when saved data is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem(MULTIPLAYER_CREDENTIALS_STORAGE_KEY, "{bad json");

    expect(readMultiplayerCredentials(storage)).toEqual({
      username: "",
      password: "",
      displayName: ""
    });
  });
});

describe("multiplayer settings", () => {
  it("persists the selected network mode", () => {
    const storage = new MemoryStorage();

    saveMultiplayerNetworkMode("peer-to-peer", storage);

    expect(storage.getItem(MULTIPLAYER_SETTINGS_KEY)).toBe("{\"networkMode\":\"peer-to-peer\"}");
    expect(getMultiplayerSettings(storage)).toEqual({ networkMode: "peer-to-peer" });
  });

  it("falls back to client-server when saved network mode is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem(MULTIPLAYER_SETTINGS_KEY, "{\"networkMode\":\"raw-udp\"}");

    expect(getMultiplayerSettings(storage)).toEqual({ networkMode: "client-server" });
  });
});

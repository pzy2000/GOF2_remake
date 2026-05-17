import type { MultiplayerAuthRequest } from "../types/multiplayer";

export const MULTIPLAYER_CREDENTIALS_STORAGE_KEY = "gof2-multiplayer-credentials";

export interface SavedMultiplayerCredentials {
  username: string;
  password: string;
  displayName: string;
}

function storage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function normalizeCredentials(value: unknown): SavedMultiplayerCredentials | undefined {
  if (!value || typeof value !== "object") return undefined;
  const credentials = value as Partial<Record<keyof SavedMultiplayerCredentials, unknown>>;
  return {
    username: typeof credentials.username === "string" ? credentials.username : "",
    password: typeof credentials.password === "string" ? credentials.password : "",
    displayName: typeof credentials.displayName === "string" ? credentials.displayName : ""
  };
}

export function readMultiplayerCredentials(store: Storage | undefined = storage()): SavedMultiplayerCredentials {
  if (!store) return { username: "", password: "", displayName: "" };
  try {
    const raw = store.getItem(MULTIPLAYER_CREDENTIALS_STORAGE_KEY);
    const parsed = raw ? normalizeCredentials(JSON.parse(raw)) : undefined;
    return parsed ?? { username: "", password: "", displayName: "" };
  } catch {
    return { username: "", password: "", displayName: "" };
  }
}

export function saveMultiplayerCredentials(request: MultiplayerAuthRequest, store: Storage | undefined = storage()): SavedMultiplayerCredentials {
  const credentials = {
    username: request.username,
    password: request.password,
    displayName: request.displayName ?? ""
  };
  if (!store) return credentials;
  store.setItem(MULTIPLAYER_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  return credentials;
}

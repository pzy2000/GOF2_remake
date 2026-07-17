export type E2EHookSignals = {
  development: boolean;
  queryEnabled: boolean;
  storageEnabled: boolean;
};

export function shouldExposeE2EHook(signals: E2EHookSignals): boolean {
  return signals.development && (signals.queryEnabled || signals.storageEnabled);
}

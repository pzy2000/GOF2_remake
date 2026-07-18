export type ReleasableWebGlRenderer = {
  setAnimationLoop?: (callback: null) => void;
  renderLists?: { dispose?: () => void };
  forceContextLoss?: () => void;
};

export function isWebGlContextCreationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /error creating webgl context|webgl context could not be created/i.test(message);
}

/**
 * Release the renderer context as soon as the flight Canvas unmounts.
 *
 * React Three Fiber performs the same teardown after a 500 ms grace period.
 * That delay is useful for general remounts, but on constrained Android
 * WebViews it lets a station launch allocate a second context while the old
 * flight context is still alive.
 */
export function releaseWebGlRendererContext(renderer: ReleasableWebGlRenderer | null | undefined): void {
  if (!renderer) return;

  try {
    renderer.setAnimationLoop?.(null);
  } catch {
    // Continue releasing the context after a partial driver cleanup failure.
  }
  try {
    renderer.renderLists?.dispose?.();
  } catch {
    // Cached render lists are best-effort cleanup.
  }
  try {
    const forceContextLoss = renderer.forceContextLoss;
    if (forceContextLoss) {
      // R3F will call this method again from its delayed teardown. Replace the
      // instance method with an idempotent wrapper. A failed first attempt is
      // deliberately left retryable by R3F's later teardown.
      let released = false;
      renderer.forceContextLoss = () => {
        if (released) return;
        forceContextLoss.call(renderer);
        released = true;
      };
      renderer.forceContextLoss();
    }
  } catch {
    // A lost or already released context is safe to ignore during unmount.
  }
}

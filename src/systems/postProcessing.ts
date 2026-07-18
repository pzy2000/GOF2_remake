type DisposablePostProcessingPass = {
  dispose?: () => void;
  // Three r171's UnrealBloomPass.dispose() omits this owned material.
  materialHighPassFilter?: { dispose?: () => void };
};

export type DisposablePostProcessingComposer = {
  passes: DisposablePostProcessingPass[];
  dispose: () => void;
};

/**
 * EffectComposer.dispose() only releases the composer's two main render
 * targets. Pass-owned targets (notably UnrealBloomPass' mip chain) must be
 * released separately or every scene-profile change leaves GPU allocations
 * behind.
 */
export function disposePostProcessingComposer(composer: DisposablePostProcessingComposer | null | undefined): void {
  if (!composer) return;

  const passes = composer.passes.splice(0);
  for (const pass of passes) {
    try {
      pass.dispose?.();
    } catch {
      // Keep releasing the rest of the GPU resources after a partial failure.
    }
    try {
      pass.materialHighPassFilter?.dispose?.();
    } catch {
      // Treat version-specific pass resources as best-effort cleanup too.
    }
  }

  try {
    composer.dispose();
  } catch {
    // Cleanup is best-effort and must not crash the active WebView.
  }
}

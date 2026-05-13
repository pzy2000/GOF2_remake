import { debugScenarios } from "../data/world";
import { defaultFlightTuning } from "../systems/flightTuning";
import { useGameStore } from "../state/gameStore";

export function DebugScenarioPanel() {
  const applyDebugScenario = useGameStore((state) => state.applyDebugScenario);
  const runtime = useGameStore((state) => state.runtime);
  const enabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).has("debug") || window.localStorage.getItem("gof2-debug-panel") === "true");

  if (!enabled) return null;

  return (
    <aside className="debug-scenario-panel" data-testid="debug-scenario-panel">
      <div>
        <span>DEV SCENARIOS</span>
        <b>{defaultFlightTuning.performance.targetDesktopFps} FPS budget</b>
      </div>
      <p>
        Effects {runtime.effects.length}/{defaultFlightTuning.performance.maxVisibleEffects} · Projectiles {runtime.projectiles.length}/{defaultFlightTuning.performance.maxVisibleProjectiles}
      </p>
      <div className="debug-scenario-actions">
        {debugScenarios.map((scenario) => (
          <button key={scenario.id} type="button" title={scenario.description} onClick={() => applyDebugScenario(scenario.id)}>
            {scenario.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

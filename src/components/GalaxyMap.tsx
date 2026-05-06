import { factionNames } from "../data/world";
import { stationById, systems, useGameStore } from "../state/gameStore";

export function GalaxyMap({ embedded = false }: { embedded?: boolean }) {
  const currentSystemId = useGameStore((state) => state.currentSystemId);
  const knownSystems = useGameStore((state) => state.knownSystems);
  const jumpToSystem = useGameStore((state) => state.jumpToSystem);
  const setScreen = useGameStore((state) => state.setScreen);
  return (
    <section className={embedded ? "galaxy embedded" : "modal-screen galaxy"}>
      <div className="modal-panel wide">
        <header className="screen-header">
          <div>
            <p className="eyebrow">Navigation</p>
            <h2>Galaxy Map</h2>
          </div>
          {!embedded ? <button onClick={() => setScreen("flight")}>Return</button> : null}
        </header>
        <div className="system-grid">
          {systems.map((system) => {
            const known = knownSystems.includes(system.id);
            const current = system.id === currentSystemId;
            return (
              <article key={system.id} className={`system-node ${current ? "current" : ""}`}>
                <h3>{system.name}</h3>
                <p>{system.description}</p>
                <p>{factionNames[system.factionId]} · Risk {Math.round(system.risk * 100)}%</p>
                <p>Station: {system.stationIds.map((id) => stationById[id].name).join(", ")}</p>
                <button disabled={!known || current} onClick={() => jumpToSystem(system.id)}>
                  {current ? "Current System" : known ? "Jump" : "Unknown"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

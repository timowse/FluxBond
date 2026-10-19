import { StrictMode, useMemo, useState } from "react";
import type { Leftovers } from "../api/types";
import { createRoot } from "react-dom/client";
import "../styles/global.css";
import { useUpdater } from "../lib/useUpdater";
import { About } from "../views/About";
import { Main } from "../views/Main";
import { Settings } from "../views/Settings";
import { type UpdateScenario, fakeUpdater, scenarios } from "./fakeUpdater";
import { type FixtureName, fixtures } from "./fixtures";

// The popup's pages with made-up data, outside Tauri, for screenshots:
// /demo.html?state=active (off, active, limited, attention, failedToStart) and &view=settings (or about).
// Updates come from a fake server: &update=available (latest, available, offline, badSignature,
// restartFails), and &launch=1 checks at start as with "Check for updates at start" on.
// &leftovers=1 adds an earlier MultiPath installation to Settings (&leftovers=running: it still runs).
const params = new URLSearchParams(location.search);
const status = fixtures[(params.get("state") ?? "off") as FixtureName] ?? fixtures.off;
document.documentElement.dataset.platform = status.platform;
const scenario = params.get("update") as UpdateScenario;
const noop = () => {};
const leftoverParam = params.get("leftovers");
const initialLeftovers: Leftovers | null = leftoverParam
  ? { running: leftoverParam === "running", items: ["loginItem", "settings", "caches"] }
  : null;

function Demo() {
  const [view, setView] = useState(params.get("view") ?? "main");
  const updater = useMemo(() => fakeUpdater(scenarios.includes(scenario) ? scenario : "latest"), []);
  const update = useUpdater(updater, params.get("launch") === "1");
  const [leftovers, setLeftovers] = useState(initialLeftovers);
  const removeLeftovers = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 300)).then(() => setLeftovers({ running: false, items: [] }));

  if (view === "about") {
    // The opened page is shown in the title, for the tests, instead of a browser.
    return <About status={status} onBack={() => setView("settings")} onOpen={(page) => (document.title = `open ${page}`)} />;
  }
  return view === "settings" ? (
    <Settings
      status={status}
      onStatus={noop}
      onBack={() => setView("main")}
      update={update}
      onAbout={() => setView("about")}
      leftovers={leftovers}
      onRemoveLeftovers={removeLeftovers}
    />
  ) : (
    <Main
      status={status}
      onStatus={noop}
      onSettings={() => setView("settings")}
      onConnections={noop}
      update={update.state}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="popup">
      <Demo />
    </div>
  </StrictMode>,
);

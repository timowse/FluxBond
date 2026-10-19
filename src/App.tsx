import { useEffect, useState } from "react";
import { getLeftovers, openPage, removeLeftovers } from "./api/commands";
import type { Leftovers } from "./api/types";
import { appUpdater } from "./api/updater";
import { useStatus } from "./api/useStatus";
import { hidePopup, useFitWindow } from "./api/window";
import { useUpdater } from "./lib/useUpdater";
import { About } from "./views/About";
import { Connections } from "./views/Connections";
import { Main } from "./views/Main";
import { Settings } from "./views/Settings";

type View = "main" | "settings" | "connections" | "about";

export default function App() {
  const ref = useFitWindow<HTMLDivElement>();
  const [status, setStatus] = useStatus();
  const [view, setView] = useState<View>("main");
  // Update releases exist for macOS only, so only macOS looks for them at start.
  const checkAtStart = status ? status.platform === "macos" && status.settings.checkUpdates : null;
  const update = useUpdater(appUpdater, checkAtStart);
  const [leftovers, setLeftovers] = useState<Leftovers | null>(null);

  // Looked up each time Settings opens, as MultiPath may have quit or been removed meanwhile.
  useEffect(() => {
    if (view !== "settings") return;
    let alive = true;
    getLeftovers()
      .then((found) => alive && setLeftovers(found))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [view]);

  // Esc goes back a page, and from the first page hides the popup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (view === "main") void hidePopup();
      else setView(view === "about" ? "settings" : "main");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  // Lets the styles follow each system's conventions (light mode on macOS).
  const platform = status?.platform;
  useEffect(() => {
    if (platform) document.documentElement.dataset.platform = platform;
  }, [platform]);

  const back = () => setView("main");

  return (
    <div ref={ref} className="popup">
      {!status ? (
        <div className="empty">Loading…</div>
      ) : view === "settings" ? (
        <Settings
          status={status}
          onStatus={setStatus}
          onBack={back}
          update={update}
          onAbout={() => setView("about")}
          leftovers={leftovers}
          onRemoveLeftovers={() => removeLeftovers().then(setLeftovers)}
        />
      ) : view === "about" ? (
        <About status={status} onBack={() => setView("settings")} onOpen={(page) => void openPage(page).catch(() => {})} />
      ) : view === "connections" ? (
        <Connections status={status} onBack={back} />
      ) : (
        <Main
          status={status}
          onStatus={setStatus}
          onSettings={() => setView("settings")}
          onConnections={() => setView("connections")}
          update={update.state}
        />
      )}
    </div>
  );
}

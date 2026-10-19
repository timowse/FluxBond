import { useState } from "react";
import { errorText } from "../api/commands";
import type { Leftover, Leftovers } from "../api/types";

interface Props {
  leftovers: Leftovers;
  /** Removes everything listed; rejects with the reason it couldn't. */
  onRemove: () => Promise<unknown>;
}

const NAMES: Record<Leftover, string> = {
  loginItem: "its login item",
  settings: "its settings",
  caches: "its caches",
};

/** "a, b and c" */
export function listText(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * What an earlier MultiPath installation left behind. Nothing is removed without a second, explicit
 * confirmation, and the MultiPath app itself is never touched.
 */
export function OldInstall({ leftovers, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = listText(leftovers.items.map((item) => NAMES[item]));

  const remove = () => {
    setBusy(true);
    setError(null);
    onRemove()
      .then(() => setConfirming(false))
      .catch((e) => setError(errorText(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="setting-row stacked">
      <div className="setting-text">
        <span className="setting-label">MultiPath left files behind</span>
        <span className="setting-desc">
          An earlier MultiPath installation on this Mac still has {list}. FluxBond copied its settings when it
          first opened. The MultiPath app stays in Applications until you remove it yourself.
        </span>
        {leftovers.running && (
          <span className="setting-desc">Quit MultiPath from its menu bar icon to remove them.</span>
        )}
      </div>
      {error && (
        <span className="setting-desc warn-text" role="alert">
          {error}
        </span>
      )}
      {confirming ? (
        <div className="confirm" role="group" aria-label="Confirm removal">
          <span className="setting-desc">Remove {list} of MultiPath? This can't be undone.</span>
          <div className="update-actions">
            <button type="button" className="primary-button" disabled={busy} onClick={remove}>
              Remove
            </button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="update-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={leftovers.running}
            onClick={() => setConfirming(true)}
          >
            Remove MultiPath leftovers…
          </button>
        </div>
      )}
    </div>
  );
}

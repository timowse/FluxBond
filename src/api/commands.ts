import { invoke } from "@tauri-apps/api/core";
import type { Connection, Leftovers, OptionChange, Page, Status } from "./types";

export const getStatus = () => invoke<Status>("get_status");

/**
 * Turning on without admin rights restarts FluxBond through the UAC (or pkexec) prompt; on macOS
 * it asks for the administrator password instead.
 */
export const setEnabled = (enabled: boolean) => invoke<Status>("set_enabled", { enabled });

export const setLinkEnabled = (id: string, enabled: boolean) =>
  invoke<Status>("set_link_enabled", { id, enabled });

export const setLinkWeight = (id: string, weight: number) =>
  invoke<Status>("set_link_weight", { id, weight });

export const setOption = (change: OptionChange) => invoke<Status>("set_option", { change });

export const listConnections = () => invoke<Connection[]>("list_connections");

/** What an earlier MultiPath installation left behind. */
export const getLeftovers = () => invoke<Leftovers>("get_leftovers");

/** Removes those leftovers; only call after the user confirmed. */
export const removeLeftovers = () => invoke<Leftovers>("remove_leftovers");

/** Opens one of the About screen's pages in the default browser. */
export const openPage = (page: Page) => invoke<void>("open_page", { page });

/** Commands reject with the message string the Rust side returned. */
/** Rust errors start in lower case; the popup shows them as sentences. */
export function errorText(err: unknown): string {
  const text = typeof err === "string" ? err : err instanceof Error ? err.message : String(err);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

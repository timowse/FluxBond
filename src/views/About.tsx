import { ExternalLink } from "lucide-react";
import type { Page, Status } from "../api/types";
import { hidePopup } from "../api/window";
import { BrandMark } from "../components/BrandMark";
import { SubHeader } from "../components/Header";
import { Section } from "./Settings";

interface Props {
  status: Status;
  onBack: () => void;
  /** Opens a page in the browser; the popup itself never navigates away. */
  onOpen: (page: Page) => void;
}

/** Version, who made FluxBond, what it's based on, and its licenses. */
export function About({ status, onBack, onOpen }: Props) {
  const link = (page: Page, label: string) => (
    <button type="button" className="link-button" onClick={() => onOpen(page)}>
      {label}
      <ExternalLink size={11} aria-hidden />
    </button>
  );

  return (
    <>
      <SubHeader title="About" onBack={onBack} onMinimize={hidePopup} />
      <div className="divider" />
      <section className="about-head" aria-label="FluxBond">
        <span className="app-mark large">
          <BrandMark size={30} />
        </span>
        <div className="setting-text">
          <span className="about-name">FluxBond</span>
          <span className="setting-desc">Version {status.version}</span>
        </div>
      </section>
      <p className="about-intro">
        Combines Wi-Fi, Ethernet and a tethered phone into one faster connection. It runs only on your own
        computer, with no account and no server in between.
      </p>

      <div className="divider" />
      <Section title="Made by">
        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-label">Timo Wiese</span>
            <span className="setting-desc">
              Developed by Timo Wiese with AI-assisted development: the macOS backend for Apple silicon, the
              native routing and DNS integration, the redesigned interface and the signed updates.
            </span>
            <div className="about-links">{link("repository", "FluxBond on GitHub")}</div>
          </div>
        </div>
      </Section>

      <div className="divider" />
      <Section title="Credits">
        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-label">Based on MultiPath by Uditya Kumar</span>
            <span className="setting-desc">
              FluxBond builds on the connection engine of MultiPath, which Uditya Kumar created and released
              under the MIT License.
            </span>
            <div className="about-links">
              {link("upstream", "MultiPath on GitHub")}
              {link("upstreamLicense", "MultiPath license")}
            </div>
          </div>
        </div>
      </Section>

      <div className="divider" />
      <Section title="License">
        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-label">MIT License</span>
            <span className="setting-desc">
              FluxBond is open source. Its license keeps the original copyright notice, and the notice file
              says what this distribution adds.
            </span>
            <div className="about-links">
              {link("license", "FluxBond license")}
              {link("notice", "Notice")}
            </div>
          </div>
        </div>
      </Section>
      <div className="bottom-spacer" />
    </>
  );
}

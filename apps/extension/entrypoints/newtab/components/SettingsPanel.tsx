import { useEffect, useState } from "react";
import { MODEL_CHOICES, normalizeBlockList, type HomepageModel } from "@homepage/agent-core";
import { REBUILD_INTERVAL_CHOICES } from "@/lib/auto-rebuild";
import { CloseIcon } from "./icons";

/** One-click starting points for the instructions box (from the README's examples). */
const EXAMPLES: [label: string, text: string][] = [
  ["Morning newspaper", "A morning newspaper. Serif type, a big masthead, a lead story, a column of briefs."],
  ["Calm reading list", "One calm column. No images. Five things worth reading, with one line on why."],
  ["Work dashboard", "Dense dashboard: GitHub PRs and issues first, then Hacker News, then everything else."],
  ["Retro terminal", "Green-on-black terminal, monospace, like a 1980s BBS."],
  ["Skip topics", "Skip sports and politics."],
];

/** Display order, cheapest to most capable, with a one-word trade-off each. */
const MODEL_NOTES: Record<HomepageModel, string> = {
  "claude-haiku-5-5": "Fastest",
  "claude-sonnet-5-5": "Balanced",
  "claude-opus-5-5": "Most careful",
};

const intervalLabel = (h: number) => (h === 24 ? "Once a day" : h === 48 ? "Every 2 days" : `Every ${h} hours`);

export function SettingsPanel({
  initialPrompt,
  blockedSites,
  model,
  onChangeModel,
  autoRebuild,
  onToggleAutoRebuild,
  intervalHours,
  onChangeInterval,
  apiKey,
  onChangeKey,
  building,
  onClose,
  onSave,
}: {
  initialPrompt: string;
  blockedSites: string[];
  model: HomepageModel;
  onChangeModel: (next: HomepageModel) => void;
  autoRebuild: boolean;
  onToggleAutoRebuild: (next: boolean) => void;
  intervalHours: number;
  onChangeInterval: (next: number) => void;
  apiKey: string;
  onChangeKey: () => void;
  /** A build is already running, so "Save & rebuild" would be a no-op. */
  building: boolean;
  onClose: () => void;
  onSave: (prompt: string, blockedSites: string[], rebuild: boolean) => void;
}) {
  const [draft, setDraft] = useState(initialPrompt);
  const [blockedDraft, setBlockedDraft] = useState(blockedSites.join("\n"));
  const dirty = draft !== initialPrompt || blockedDraft !== blockedSites.join("\n");
  const save = (rebuild: boolean) => onSave(draft, normalizeBlockList(blockedDraft.split("\n")), rebuild);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="drawer-head">
          <h2 className="drawer-title" id="settings-title">
            Settings
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings" title="Close (Esc)">
            <CloseIcon />
          </button>
        </header>

        <div className="drawer-body">
          <section className="section">
            <label className="section-label" htmlFor="instructions">
              Instructions
            </label>
            <p className="section-help">
              What your homepage shows and how it looks. Used in every build, ahead of the agent&apos;s
              own defaults.
            </p>
            <textarea
              id="instructions"
              className="textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Describe the page you want, or start from an example below."
            />
            <div className="chips">
              {EXAMPLES.map(([label, text]) => (
                <button
                  key={label}
                  type="button"
                  className="chip"
                  title={text}
                  onClick={() => setDraft((d) => (d.trim() ? `${d.trimEnd()}\n${text}` : text))}
                >
                  + {label}
                </button>
              ))}
            </div>
          </section>

          <section className="section">
            <span className="section-label" id="model-label">
              Model
            </span>
            <p className="section-help">Writes your page. Applies from the next build.</p>
            <div className="segmented" role="radiogroup" aria-labelledby="model-label">
              {(Object.keys(MODEL_NOTES) as HomepageModel[]).map((id) => (
                <label key={id} className="seg-opt">
                  <input
                    className="visually-hidden"
                    type="radio"
                    name="model"
                    checked={model === id}
                    onChange={() => onChangeModel(id)}
                  />
                  {MODEL_CHOICES.find((m) => m.id === id)?.label.replace(/^Claude /, "")}
                  <small>{MODEL_NOTES[id]}</small>
                </label>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div>
                <label className="section-label" htmlFor="auto-rebuild">
                  Rebuild automatically
                </label>
                <p className="section-help" style={{ margin: 0 }}>
                  Refreshes in the background so new tabs stay current. Each build is billed to your
                  API key.
                </p>
              </div>
              <input
                id="auto-rebuild"
                className="switch"
                type="checkbox"
                role="switch"
                checked={autoRebuild}
                onChange={(e) => onToggleAutoRebuild(e.target.checked)}
              />
            </div>
            <div className="row">
              <label className="row-label" htmlFor="interval">
                How often
              </label>
              <select
                id="interval"
                className="select"
                value={intervalHours}
                disabled={!autoRebuild}
                onChange={(e) => onChangeInterval(Number(e.target.value))}
              >
                {REBUILD_INTERVAL_CHOICES.map((h) => (
                  <option key={h} value={h}>
                    {intervalLabel(h)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="section">
            <details className="disclosure">
              <summary>
                Sites the agent never reads
                <span className="count">{normalizeBlockList(blockedDraft.split("\n")).length}</span>
              </summary>
              <textarea
                className="textarea mono"
                value={blockedDraft}
                onChange={(e) => setBlockedDraft(e.target.value)}
                aria-label="Sites the agent never reads"
                aria-describedby="blocked-sites-help"
                spellCheck={false}
              />
              <p className="hint" id="blocked-sites-help">
                One per line. Subdomains are included. Use *.example.com for wildcards.
              </p>
            </details>
          </section>

          <section className="section">
            <span className="section-label">API key</span>
            <div className="key-row">
              <span>sk-ant-…{apiKey.slice(-4)}</span>
              <button className="btn btn-ghost btn-sm" onClick={onChangeKey}>
                Change key
              </button>
            </div>
          </section>
        </div>

        <footer className="drawer-foot">
          {dirty ? (
            <>
              <button className={`btn ${building ? "btn-primary" : "btn-secondary"}`} onClick={() => save(false)}>
                Save
              </button>
              {!building && (
                <button className="btn btn-primary" onClick={() => save(true)}>
                  Save &amp; rebuild
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

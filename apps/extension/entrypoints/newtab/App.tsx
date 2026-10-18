import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MODEL, DEFAULT_BLOCKED_SITES, type HomepageModel } from "@homepage/agent-core";
import { DEFAULT_REBUILD_INTERVAL_HOURS } from "@/lib/auto-rebuild";
import { BUILD_STEPS } from "@/lib/protocol";
import { KEYS, extensionStore, loadHomepage, loadSettings, saveSetting } from "@/lib/storage";
import { toRenderable } from "@/lib/transpile";
import { ApiKeySetup } from "./components/ApiKeySetup";
import { BuildProgress } from "./components/BuildProgress";
import { HomepagePreview } from "./components/HomepagePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { CloseIcon, RefreshIcon, SlidersIcon } from "./components/icons";
import ChinesePlanCard from "./components/ChinesePlanCard";
import { useHomepageBuild } from "./useHomepageBuild";

/** "Updated 3h ago" for the controls pill. */
function updatedLabel(iso: string | null) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `Updated ${hours}h ago` : `Updated ${Math.round(hours / 24)}d ago`;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [blockedSites, setBlockedSites] = useState<string[]>(DEFAULT_BLOCKED_SITES);
  const [model, setModel] = useState<HomepageModel>(DEFAULT_MODEL);
  const [autoRebuild, setAutoRebuild] = useState(true);
  const [intervalHours, setIntervalHours] = useState(DEFAULT_REBUILD_INTERVAL_HOURS);
  /** Transpiled homepage, ready for Sandpack. */
  const [renderedCode, setRenderedCode] = useState<string | null>(null);
  /** ISO time the current homepage was built. */
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  /** A session left mid-flight, offered as "Resume interrupted build". */
  const [resumable, setResumable] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  /** Expand the full progress view over an existing homepage. */
  const [viewProgress, setViewProgress] = useState(false);
  /** The error the user dismissed, so a stale banner doesn't linger. */
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const { state, build, cancel } = useHomepageBuild((code) => {
    setRenderedCode(toRenderable(code));
    setBuiltAt(new Date().toISOString());
  });

  // Once a build finishes, drop back to the homepage view.
  useEffect(() => {
    if (!state.running) setViewProgress(false);
  }, [state.running]);

  // Scheduled rebuilds are driven by the worker's alarm, not by opening a tab;
  // useHomepageBuild surfaces any build already in flight.
  useEffect(() => {
    (async () => {
      try {
        const [settings, homepage, activeSession] = await Promise.all([
          loadSettings(),
          loadHomepage(),
          extensionStore.get<string>(KEYS.activeSessionId),
        ]);
        setApiKey(settings.apiKey);
        setSystemPrompt(settings.systemPrompt);
        setBlockedSites(settings.blockedSites);
        setModel(settings.model);
        setAutoRebuild(settings.autoRebuild);
        setIntervalHours(settings.rebuildIntervalHours ?? DEFAULT_REBUILD_INTERVAL_HOURS);
        setResumable(activeSession ?? null);
        if (homepage?.code) {
          setRenderedCode(toRenderable(homepage.code));
          setBuiltAt(homepage.timestamp);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveKey = useCallback(async (key: string) => {
    await saveSetting("apiKey", key);
    setApiKey(key);
  }, []);

  const changeKey = useCallback(async () => {
    await extensionStore.remove(KEYS.apiKey);
    setShowSettings(false);
    setApiKey(null);
  }, []);

  // The current homepage stays up while a rebuild runs; the pill shows progress.
  const savePrompt = useCallback(
    async (prompt: string, sites: string[], rebuild: boolean) => {
      await Promise.all([saveSetting("systemPrompt", prompt), saveSetting("blockedSites", sites)]);
      setBlockedSites(sites);
      setSystemPrompt(prompt);
      setShowSettings(false);
      if (rebuild) build();
    },
    [build],
  );

  // These persist immediately; the worker reads them on its next heartbeat or build.
  const changeModel = useCallback(async (next: HomepageModel) => {
    setModel(next);
    await saveSetting("model", next);
  }, []);
  const toggleAutoRebuild = useCallback(async (next: boolean) => {
    setAutoRebuild(next);
    await saveSetting("autoRebuild", next);
  }, []);
  const changeInterval = useCallback(async (next: number) => {
    setIntervalHours(next);
    await saveSetting("rebuildIntervalHours", next);
  }, []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  if (loading) return null;
  if (!apiKey) return <ApiKeySetup onSave={saveKey} />;

  // With no homepage to fall back to, a running build takes over the tab.
  if (state.running && (!renderedCode || viewProgress)) {
    return (
      <BuildProgress
        state={state}
        onCancel={cancel}
        onBack={renderedCode ? () => setViewProgress(false) : undefined}
      />
    );
  }

  const settings = showSettings && (
    <SettingsPanel
      initialPrompt={systemPrompt}
      blockedSites={blockedSites}
      model={model}
      onChangeModel={changeModel}
      autoRebuild={autoRebuild}
      onToggleAutoRebuild={toggleAutoRebuild}
      intervalHours={intervalHours}
      onChangeInterval={changeInterval}
      apiKey={apiKey}
      onChangeKey={changeKey}
      building={state.running}
      onClose={closeSettings}
      onSave={savePrompt}
    />
  );

  if (!renderedCode) {
    return (
      <main className="screen">
        <div className="screen-card">
          <h1 className="screen-title">Build your first homepage</h1>
          <p className="screen-lede">An agent reads the sites you follow and writes you a fresh front page.</p>
          <ol className="steps-preview">
            <li>
              <span>
                <b>Reads your history</b> to find the sites you visit most.
              </span>
            </li>
            <li>
              <span>
                <b>Opens those pages</b> in this browser, signed in as you.
              </span>
            </li>
            <li>
              <span>
                <b>Writes your homepage</b> from what&apos;s new on them today.
              </span>
            </li>
          </ol>
          {state.error && (
            <div className="alert" role="alert">
              {state.error}
            </div>
          )}
          <div className="screen-actions">
            <button className="btn btn-primary btn-lg" onClick={() => build()}>
              Build today&apos;s homepage
            </button>
            {resumable && (
              <button className="btn btn-secondary btn-lg" onClick={() => build({ resume: true })}>
                Resume interrupted build
              </button>
            )}
            <button className="btn btn-ghost btn-lg" onClick={() => setShowSettings(true)}>
              Customize first
            </button>
          </div>
          <p className="screen-note">The first build takes a few minutes and is billed to your API key.</p>
        </div>
        <ChinesePlanCard />
        {settings}
      </main>
    );
  }

  const showError = state.error && dismissedError !== state.error;
  const updated = updatedLabel(builtAt);

  return (
    <>
      <HomepagePreview code={renderedCode} />

      <div className={`controls${state.running || showError ? " pinned" : ""}`}>
        <div className="pill">
          {state.running ? (
            // A build is running in the background (from here, another tab, or the
            // scheduled rebuild). Let the user watch it without losing this page.
            <button className="pill-building" onClick={() => setViewProgress(true)} title="View build progress">
              <span className="dot" />
              Building · {Math.min(state.stepIndex + 1, BUILD_STEPS.length)}/{BUILD_STEPS.length}
            </button>
          ) : (
            <>
              {updated && <span className="pill-status">{updated}</span>}
              <button className="icon-btn" onClick={() => build()} aria-label="Rebuild now" title="Rebuild now">
                <RefreshIcon />
              </button>
            </>
          )}
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
            <SlidersIcon />
          </button>
        </div>

        {showError && (
          <div className="toast" role="alert">
            <div className="toast-head">
              Rebuild failed
              <button className="icon-btn" onClick={() => setDismissedError(state.error)} aria-label="Dismiss">
                <CloseIcon />
              </button>
            </div>
            <div className="toast-body">{state.error} Your current homepage is unchanged.</div>
            <button className="btn btn-secondary btn-sm" onClick={() => build()}>
              Try again
            </button>
          </div>
        )}
      </div>

      <ChinesePlanCard />
      {settings}
    </>
  );
}

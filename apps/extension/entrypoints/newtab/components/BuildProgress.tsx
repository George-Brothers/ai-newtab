import { useEffect, useRef, useState } from "react";
import { BUILD_STEPS, LOG_RETENTION, type BuildState } from "@/lib/protocol";

/** Full-screen build view: the step list on the left, live narration and log on the right. */
export function BuildProgress({
  state,
  onCancel,
  onBack,
}: {
  state: BuildState;
  onCancel: () => void;
  /** Present when a build is running over an existing homepage — offers a way back to it. */
  onBack?: () => void;
}) {
  const { stepIndex, detail, narration, logs } = state;
  const [elapsed, setElapsed] = useState(0);
  const narrRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep the streaming panels pinned to their latest line.
  useEffect(() => {
    if (narrRef.current) narrRef.current.scrollTop = narrRef.current.scrollHeight;
  }, [narration]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="build">
      <div className="build-left">
        <div className="build-panel">
          <div className="build-top">
            <h1 className="build-title">Building your homepage</h1>
            <span className="build-elapsed" aria-label="Elapsed time">
              {mm}:{ss}
            </span>
          </div>
          <p className="build-sub">
            This takes a few minutes. You can close this tab; the build keeps going in the background.
          </p>

          <ol className="build-steps">
            {BUILD_STEPS.map((step, i) => {
              const status = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
              return (
                <li key={step.label} className={`build-step ${status}`} aria-current={status === "active" ? "step" : undefined}>
                  <span className="build-marker">{status === "done" ? "✓" : i + 1}</span>
                  <div>
                    <div className="build-step-label">{step.label}</div>
                    {status === "active" && detail && <div className="build-step-detail">{detail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="build-actions">
            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                ← Back to homepage
              </button>
            )}
            <button className="btn btn-ghost danger" onClick={onCancel}>
              Cancel build
            </button>
          </div>
        </div>
      </div>

      <div className="build-right">
        <div className="build-panel">
          <div className="build-eyebrow">What the agent is doing</div>
          <div className={`build-narration${narration ? "" : " waiting"}`} ref={narrRef} aria-live="polite">
            {narration || "Warming up. Reading what you’ve been browsing…"}
          </div>

          {logs.length > 0 && (
            <details className="build-log-details">
              <summary>Activity log · {Math.min(logs.length, LOG_RETENTION)}</summary>
              <pre className="build-log" ref={logRef}>
                {logs.slice(-LOG_RETENTION).join("\n")}
              </pre>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}

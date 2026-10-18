import { useState } from "react";

export function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState("");
  const key = value.trim();
  const valid = key.startsWith("sk-ant-");

  return (
    <main className="screen">
      <form
        className="screen-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(key);
        }}
      >
        <h1 className="screen-title">Connect your Anthropic API key</h1>
        <p className="screen-lede">
          The agent that writes your homepage runs on your own key. It stays in this browser and is
          only ever sent to Anthropic.
        </p>
        <label className="field-label" htmlFor="api-key">
          API key
        </label>
        <input
          id="api-key"
          className="input mono"
          type="password"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-…"
        />
        {key && !valid ? (
          <p className="hint error">Anthropic keys start with sk-ant-.</p>
        ) : (
          <p className="hint">
            No key yet?{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              Create one in the Anthropic Console
            </a>
            .
          </p>
        )}
        <div className="screen-actions" style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={!valid}>
            Continue
          </button>
        </div>
      </form>
    </main>
  );
}

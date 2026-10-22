import { useEffect, useState } from "react";

// The Mac's xuexi-sync job copies the vault's wiki/today.md into the built extension's plan/ folder.
const VAULT_APP =
  "file:///Users/georgebrothers/Library/CloudStorage/GoogleDrive-george.brothers8@gmail.com/My%20Drive/Obsidian%20Vaults/%E5%AD%A6%E4%B9%A0%E4%B8%AD%E6%96%87/app/%E4%B8%AD%E6%96%87.html";

type Plan = { nextLesson?: string; focus?: string; items: string[] };

export function parsePlan(md: string): Plan {
  const nextLesson = md.match(/^next_lesson:\s*(.+)$/m)?.[1].trim();
  const focus = md.match(/\*\*This week's focus:\*\*\s*(.+)/)?.[1].trim();
  // today.md can hold more than one day's list; show the first (numbering restarts at 1).
  const items: string[] = [];
  for (const m of md.matchAll(/^(\d+)\.\s+\*\*(.+?)\.?\*\*/gm)) {
    if (m[1] === "1" && items.length) break;
    items.push(m[2]);
  }
  return { nextLesson, focus, items };
}

export default function ChinesePlanCard() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetch(browser.runtime.getURL("/plan/today.md" as never))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((md) => setPlan(parsePlan(md)))
      .catch(() => setPlan(null));
  }, []);

  if (!plan) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 998,
        width: 300,
        maxWidth: "calc(100vw - 32px)",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,.12)",
        padding: 14,
        fontFamily: "system-ui",
        fontSize: 13,
        color: "#222",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <b style={{ fontSize: 15 }}>中文 today</b>
        {plan.nextLesson && <span style={{ color: "#666" }}>Next lesson {plan.nextLesson}</span>}
      </div>
      {plan.focus && <p style={{ margin: "8px 0", color: "#555", lineHeight: 1.4 }}>{plan.focus}</p>}
      <ol style={{ margin: "8px 0", paddingLeft: 18, lineHeight: 1.5 }}>
        {plan.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <button
        style={{ width: "100%", padding: "8px 16px", border: "none", borderRadius: 4, background: "#0066cc", color: "white", cursor: "pointer", fontSize: 14 }}
        onClick={() => browser.tabs.create({ url: VAULT_APP })}>
        Open dashboard
      </button>
    </div>
  );
}

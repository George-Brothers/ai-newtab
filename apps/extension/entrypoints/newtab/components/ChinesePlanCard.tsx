import { useEffect, useState } from "react";

// The Mac's xuexi-sync job copies the vault's wiki/today.md into the built extension's plan/ folder.
const VAULT_APP =
  "file:///Users/georgebrothers/Library/CloudStorage/GoogleDrive-george.brothers8@gmail.com/My%20Drive/iCloud%20Drive/Obsidian%20Vaults/%E5%AD%A6%E4%B9%A0%E4%B8%AD%E6%96%87/app/%E4%B8%AD%E6%96%87.html";

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
    <aside className="plan-card" aria-label="Chinese study plan for today">
      <div className="plan-head">
        <span className="plan-title">中文 today</span>
        {plan.nextLesson && <span className="plan-next">Next lesson {plan.nextLesson}</span>}
      </div>
      {plan.focus && <p className="plan-focus">{plan.focus}</p>}
      <ol className="plan-items">
        {plan.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <button className="btn btn-secondary btn-sm" onClick={() => browser.tabs.create({ url: VAULT_APP })}>
        Open dashboard
      </button>
    </aside>
  );
}

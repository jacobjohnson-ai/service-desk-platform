// Team dashboard (staff only). Built from the same tickets the queue shows,
// so row-level security decides what goes into it.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDesk } from "../lib/desk";
import { TARGET_HOURS } from "../lib/format";
import type { Ticket, Urgency } from "../lib/types";

// Validated for the dark surface (lightness band, colorblind separation, contrast)
const OPENED = "#3b82f6";
const RESOLVED = "#16a34a";
const DAYS = 14;
const CATEGORY: Record<string, string> = { technical_issue: "Technical issue", billing: "Billing", general: "General" };

const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 36e5;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export default function Dashboard({ tabs }: { tabs: ReactNode }) {
  const { tickets, people } = useDesk();
  const data = useMemo(() => build(tickets, people), [tickets, people]);

  return (
    <div className="dash">
      {tabs}
      <div className="dash-grid">
        <Panel title={`Tickets opened and resolved, last ${DAYS} days`} wide>
          <DailyBars days={data.days} />
        </Panel>
        <Panel title="Open tickets by category">
          <HBars rows={data.byCategory} unit="tickets" />
        </Panel>
        <Panel title="Open tickets by technician">
          <HBars rows={data.workload} unit="tickets" />
        </Panel>
        <Panel title="Average time to first reply, by urgency" wide>
          <TargetBars rows={data.response} />
        </Panel>
      </div>
      <p className="note-foot">Counts include tickets from the helpdesk agent, the n8n triage workflow, and the form. Older demo tickets were closed in bulk, which shows as a spike in resolved.</p>
    </div>
  );
}

function build(tickets: Ticket[], people: Record<string, { full_name: string; role: string }>) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), opened: 0, resolved: 0 };
  });
  const index = Object.fromEntries(days.map((d, i) => [d.key, i]));
  const open = tickets.filter((t) => t.status !== "resolved");

  for (const t of tickets) {
    const o = index[dayKey(new Date(t.created_at))];
    if (o !== undefined) days[o].opened++;
    if (t.resolved_at) {
      const r = index[dayKey(new Date(t.resolved_at))];
      if (r !== undefined) days[r].resolved++;
    }
  }

  const count = (key: (t: Ticket) => string) => {
    const m = new Map<string, number>();
    open.forEach((t) => m.set(key(t), (m.get(key(t)) ?? 0) + 1));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };

  const response = (["high", "medium", "low"] as Urgency[]).map((u) => {
    const replied = tickets.filter((t) => t.urgency === u && t.first_response_at);
    return { label: u[0].toUpperCase() + u.slice(1), urgency: u, hours: avg(replied.map((t) => hoursBetween(t.created_at, t.first_response_at!))), n: replied.length };
  });

  return {
    days,
    byCategory: count((t) => CATEGORY[t.category] ?? t.category),
    workload: count((t) => (t.assigned_to && people[t.assigned_to]?.full_name) || "Unassigned"),
    response,
  };
}

function Panel({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return <section className={`box panel${wide ? " wide" : ""}`}><h3 className="lbl">{title}</h3>{children}</section>;
}

// Grouped bars: opened (blue) and resolved (green) per day, with a legend and hover tooltip
function DailyBars({ days }: { days: { label: string; opened: number; resolved: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real pixel width so text and bars stay the same size on any screen
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(700);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 220, L = 30, B = 24, T = 8;
  const every = W < 500 ? 4 : W < 800 ? 2 : 1;
  const max = Math.max(1, ...days.flatMap((d) => [d.opened, d.resolved]));
  const step = niceStep(max), top = Math.ceil(max / step) * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L) / days.length, bw = Math.max(3, Math.min(14, (slot - 8) / 2));
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div className="chart" ref={box}>
      <div className="legend">
        <span><i style={{ background: OPENED }} />Opened</span><span><i style={{ background: RESOLVED }} />Resolved</span>
        <span className="tip">{hover !== null ? <>{days[hover].label}: <b>{days[hover].opened}</b> opened · <b>{days[hover].resolved}</b> resolved</> : "Hover a day for numbers"}</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tickets opened and resolved per day">
        {ticks.map((v) => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} className="grid" /><text x={L - 8} y={y(v) + 4} className="axis" textAnchor="end">{v}</text></g>)}
        {days.map((d, i) => {
          const cx = L + slot * i + slot / 2;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={T} width={slot} height={H - T - B} fill={hover === i ? "rgba(255,255,255,.04)" : "transparent"} />
              {d.opened > 0 && <Bar x={cx - bw - 1} w={bw} y0={y(0)} y1={y(d.opened)} color={OPENED} />}
              {d.resolved > 0 && <Bar x={cx + 1} w={bw} y0={y(0)} y1={y(d.resolved)} color={RESOLVED} />}
              {(days.length - 1 - i) % every === 0 && <text x={i === days.length - 1 ? Math.min(cx, W - 2) : cx} y={H - 6} className="axis" textAnchor={i === days.length - 1 && cx + 22 > W ? "end" : "middle"}>{d.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Bar with a rounded data end, anchored square to the baseline
function Bar({ x, w, y0, y1, color }: { x: number; w: number; y0: number; y1: number; color: string }) {
  const h = y0 - y1, r = Math.min(4, h, w / 2);
  return <path d={`M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`} fill={color} />;
}

function HBars({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  if (!rows.length) return <div className="empty">No open tickets.</div>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label} title={`${r.label}: ${r.value} ${unit}`}>
          <span className="hl">{r.label}</span>
          <span className="track"><span className="fill" style={{ width: `${(r.value / max) * 100}%`, background: OPENED }} /></span>
          <span className="hv">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// Average first-reply time per urgency, with the target marked on each track
function TargetBars({ rows }: { rows: { label: string; urgency: Urgency; hours: number | null; n: number }[] }) {
  const scale = Math.max(...rows.map((r) => Math.max(r.hours ?? 0, TARGET_HOURS[r.urgency]))) * 1.1;
  return (
    <div className="hbars">
      {rows.map((r) => {
        const target = TARGET_HOURS[r.urgency], late = r.hours !== null && r.hours > target;
        return (
          <div className="hbar" key={r.label} title={r.hours === null ? "No replies yet" : `${r.label}: ${r.hours.toFixed(1)}h average over ${r.n} tickets (target ${target}h)`}>
            <span className="hl">{r.label}</span>
            <span className="track">
              {r.hours !== null && <span className="fill" style={{ width: `${(r.hours / scale) * 100}%`, background: late ? "var(--red)" : RESOLVED }} />}
              <span className="target" style={{ left: `${(target / scale) * 100}%` }} />
            </span>
            <span className="hv">{r.hours === null ? "No replies yet" : <>{r.hours.toFixed(1)}h <span className="due">of {target}h target</span></>}</span>
          </div>
        );
      })}
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw)), n = raw / p;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p);
}

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useDesk } from "../lib/desk";
import type { DeskStats } from "../lib/types";

const hours = (h: number | null) => (h == null ? "–" : `${h}h`);

export default function StatsRow() {
  const { tickets } = useDesk();
  const [s, setS] = useState<DeskStats | null>(null);

  // Re-read whenever the ticket list changes (a ticket was resolved, assigned, etc.)
  useEffect(() => {
    api<DeskStats[]>("/rest/v1/desk_stats?select=*").then((r) => setS(r[0] ?? null)).catch(() => {});
  }, [tickets]);

  if (!s) return null;
  const items: [string, string | number][] = [
    ["Open", s.open_tickets], ["In progress", s.in_progress], ["Overdue", s.overdue],
    ["First reply (avg)", hours(s.avg_hours_to_first_reply)], ["Resolve (avg)", hours(s.avg_hours_to_resolve)],
  ];
  return (
    <div className="stats">
      {items.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><b>{value}</b></div>)}
    </div>
  );
}

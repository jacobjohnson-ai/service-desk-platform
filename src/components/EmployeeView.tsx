import { useState } from "react";
import { showDetailOnPhone, splitSummary } from "../lib/format";
import { useDesk } from "../lib/desk";
import TicketRow from "./TicketRow";
import TicketDetail from "./TicketDetail";
import NewTicketForm from "./NewTicketForm";
import AgentChat from "./AgentChat";

type Pane = { kind: "agent" } | { kind: "form" } | { kind: "ticket"; id: number };

export default function EmployeeView() {
  const { me, tickets } = useDesk();
  const [pane, setPane] = useState<Pane>({ kind: "agent" });
  const [allResolved, setAllResolved] = useState(false);
  const mine = tickets.filter((t) => t.requester_id === me.id);
  const open = mine.filter((t) => t.status !== "resolved");
  const done = mine.filter((t) => t.status === "resolved");
  const shownDone = allResolved ? done : done.slice(0, 5);
  const pick = (id: number) => { setPane({ kind: "ticket", id }); showDetailOnPhone(); };

  return (
    <div className="split">
      <div className="col">
        <div className="dh" style={{ marginBottom: 12 }}>
          <div className="lbl">My tickets</div>
          <div className="btns">
            <button className="s" onClick={() => setPane({ kind: "agent" })}>Ask the agent</button>
            <button className="s" onClick={() => setPane({ kind: "form" })}>New ticket form</button>
          </div>
        </div>
        {!mine.length && <div className="empty">No tickets yet.</div>}
        {open.length > 0 && <>
          <div className="lbl sub">Open · {open.length}</div>
          <div className="list">
            {open.map((t) => <TicketRow key={t.id} t={t} selected={pane.kind === "ticket" && pane.id === t.id} onSelect={() => pick(t.id)} />)}
          </div>
        </>}
        {done.length > 0 && <>
          <div className="lbl sub">Recently resolved</div>
          <div className="rlist">
            {shownDone.map((t) => (
              <button key={t.id} className={"rrow" + (pane.kind === "ticket" && pane.id === t.id ? " sel" : "")} onClick={() => pick(t.id)}>
                <span className="rn">#{t.id}</span>
                <span className="rt"><i className="rd" />{splitSummary(t.summary).title.replace(/\.$/, "")}</span>
                <span className="rdt">{new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </button>
            ))}
          </div>
          {done.length > 5 && <button className="rmore" onClick={() => setAllResolved(!allResolved)}>{allResolved ? "Show fewer" : `Show all ${done.length} resolved`}</button>}
        </>}
      </div>
      <div className="col" id="detail">
        {pane.kind === "agent" && <AgentChat onOpenTicket={(id) => setPane({ kind: "ticket", id })} />}
        {pane.kind === "form" && <NewTicketForm onCreated={(id) => setPane({ kind: "ticket", id })} />}
        {pane.kind === "ticket" && <TicketDetail id={pane.id} />}
      </div>
    </div>
  );
}

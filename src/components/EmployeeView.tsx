import { useState } from "react";
import { showDetailOnPhone } from "../lib/format";
import { useDesk } from "../lib/desk";
import TicketRow from "./TicketRow";
import TicketDetail from "./TicketDetail";
import NewTicketForm from "./NewTicketForm";
import AgentChat from "./AgentChat";

type Pane = { kind: "agent" } | { kind: "form" } | { kind: "ticket"; id: number };

export default function EmployeeView() {
  const { me, tickets } = useDesk();
  const [pane, setPane] = useState<Pane>({ kind: "agent" });
  const mine = tickets.filter((t) => t.requester_id === me.id);

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
        <div className="list">
          {mine.length ? mine.map((t) => (
            <TicketRow key={t.id} t={t} selected={pane.kind === "ticket" && pane.id === t.id}
              onSelect={() => { setPane({ kind: "ticket", id: t.id }); showDetailOnPhone(); }} />
          )) : <div className="empty">No tickets yet.</div>}
        </div>
      </div>
      <div className="col" id="detail">
        {pane.kind === "agent" && <AgentChat onOpenTicket={(id) => setPane({ kind: "ticket", id })} />}
        {pane.kind === "form" && <NewTicketForm onCreated={(id) => setPane({ kind: "ticket", id })} />}
        {pane.kind === "ticket" && <TicketDetail id={pane.id} />}
      </div>
    </div>
  );
}

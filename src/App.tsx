import { useCallback, useEffect, useState } from "react";
import { api, restoreSession, signOut } from "./lib/api";
import { DeskContext, type Desk } from "./lib/desk";
import type { Profile, Session, Ticket } from "./lib/types";
import Login from "./components/Login";
import EmployeeView from "./components/EmployeeView";
import StaffView from "./components/StaffView";

const TICKET_FIELDS =
  "id,created_at,summary,message,category,urgency,priority_score,status,assigned_to,requester_id,name,department,first_response_at";

export default function App() {
  const [session, setSession] = useState<Session | null>(() => restoreSession());
  const [desk, setDesk] = useState<Omit<Desk, "reloadTickets"> | null>(null);
  const [error, setError] = useState("");

  const loadTickets = () => api<Ticket[]>(`/rest/v1/tickets?select=${TICKET_FIELDS}&order=id.desc&limit=200`);

  const reloadTickets = useCallback(async () => {
    const tickets = await loadTickets();
    setDesk((d) => (d ? { ...d, tickets } : d));
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([api<Profile[]>("/rest/v1/profiles?select=id,full_name,department,role"), loadTickets()])
      .then(([profiles, tickets]) => {
        if (cancelled) return;
        const people = Object.fromEntries(profiles.map((p) => [p.id, p]));
        const me = people[session.userId];
        if (!me) throw new Error("This login has no profile yet.");
        setDesk({ me, people, tickets, isStaff: me.role !== "employee" });
      })
      .catch((e: Error) => { if (!cancelled) { logout(); setError(e.message); } });
    return () => { cancelled = true; };
  }, [session]);

  function logout() {
    signOut();
    setSession(null);
    setDesk(null);
  }

  const roleName = desk ? desk.me.role[0].toUpperCase() + desk.me.role.slice(1) : "";

  return (
    <div className="wrap">
      <nav className="site">
        <a href="/">← Jacob Johnson</a>
        <a href="/#projects">Projects</a>
      </nav>
      <header>
        <div>
          <h1>Northwind Service Desk <span className="demo">demo</span></h1>
          <p>
            A ticketing system with logins and three roles. Employees chat with the helpdesk agent or submit tickets,
            technicians work the queue against response targets, and admins edit the knowledge base the agent uses.
            Permissions are enforced inside the database, and every change is logged.
          </p>
        </div>
        {desk && (
          <div className="who">
            <b>{desk.me.full_name}</b> · {roleName}
            <button className="s" onClick={logout}>Log out</button>
          </div>
        )}
      </header>
      <main className="main">
        {!session && <Login onSignedIn={(s) => { setError(""); setSession(s); }} initialError={error} />}
        {session && !desk && <div className="empty">Loading…</div>}
        {desk && (
          <DeskContext.Provider value={{ ...desk, reloadTickets }}>
            {desk.isStaff ? <StaffView /> : <EmployeeView />}
          </DeskContext.Provider>
        )}
      </main>
    </div>
  );
}

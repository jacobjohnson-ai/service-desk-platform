import { useState, type FormEvent } from "react";
import { signIn } from "../lib/api";
import type { Session } from "../lib/types";

const DEMO_PASSWORD = "NorthwindDemo-2026"; // public demo accounts for a fictional company
const DEMOS = [
  { email: "employee@northwind.example", name: "Employee", who: "Riley Carter · Sales", what: "Chat with the helpdesk agent, submit tickets, and see only your own." },
  { email: "tech@northwind.example", name: "Technician", who: "Morgan Diaz · IT", what: "Work the queue against response targets: assign, reply, add internal notes, resolve." },
  { email: "admin@northwind.example", name: "Admin", who: "Avery Brooks · IT", what: "Everything a technician can do, plus team stats and editing the knowledge base." },
];

export default function Login({ onSignedIn, initialError }: { onSignedIn: (s: Session) => void; initialError: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(initialError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function go(e: string, pw: string) {
    setBusy(e);
    setError("");
    try { onSignedIn(await signIn(e, pw)); }
    catch (err) { setError((err as Error).message); setBusy(null); }
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    go(email.trim(), password);
  }

  return (
    <div className="login">
      <div>
        <div className="lbl" style={{ marginBottom: 12 }}>Try it as</div>
        <div className="roles">
          {DEMOS.map((d) => (
            <button key={d.email} className={`role${busy === d.email ? " busy" : ""}`} disabled={busy !== null}
              onClick={() => go(d.email, DEMO_PASSWORD)}>
              <b>{d.name}</b>
              <span>{d.who}</span>
              <span style={{ marginTop: 8 }}>{d.what}</span>
              <em>{busy === d.email ? "Logging in…" : "Log in →"}</em>
            </button>
          ))}
        </div>
      </div>
      <div className="or">or sign in</div>
      <form className="manual" onSubmit={submit}>
        <div><label>Email</label><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button disabled={busy !== null}>Sign in</button>
      </form>
      {error && <div className="err">{error}</div>}
      <p className="note-foot">Demo accounts for a fictional company. Sign-ups are turned off, and each role can only do what the database allows.</p>
    </div>
  );
}

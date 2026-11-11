import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { useDesk } from "../lib/desk";
import { when } from "../lib/format";
import type { Article } from "../lib/types";

// Staff can read articles; only admins can add, edit, or delete (enforced by row-level security).
// The helpdesk agent reads this same table, so edits reach it within a minute.
export default function KnowledgeBase({ tabs }: { tabs: ReactNode }) {
  const { me, people } = useDesk();
  const admin = me.role === "admin";
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() =>
    api<Article[]>("/rest/v1/kb_articles?select=id,title,keywords,steps,updated_at,updated_by&order=title")
      .then(setArticles).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const current = selected && selected !== "new" ? articles?.find((a) => a.id === selected) ?? null : null;

  return (
    <div className="split">
      <div className="col">
        {tabs}
        <div className="dh" style={{ marginBottom: 10 }}>
          <div className="lbl">Articles · {articles?.length ?? "…"}</div>
          {admin && <button onClick={() => setSelected("new")}>New article</button>}
        </div>
        {error && <div className="err">{error}</div>}
        <div className="list">
          {articles?.map((a) => {
            const editor = a.updated_by ? people[a.updated_by] : null;
            return (
              <div key={a.id} className={`item kb${selected === a.id ? " sel" : ""}`} onClick={() => setSelected(a.id)}>
                <div className="kbrow"><div className="t">{a.title}</div><div className="m">{a.steps.length} steps</div></div>
                <div className="m">{a.id}{editor && ` · edited by ${editor.full_name} ${when(a.updated_at)}`}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="col">
        {selected ? (
          <ArticleForm key={selected} article={current} admin={admin}
            onSaved={(id) => { load(); setSelected(id); }} onDeleted={() => { load(); setSelected(null); }} />
        ) : (
          <div className="empty">{admin ? "Pick an article to edit. Changes reach the helpdesk agent within a minute." : "Pick an article to read. Only admins can edit."}</div>
        )}
      </div>
    </div>
  );
}

function ArticleForm({ article, admin, onSaved, onDeleted }: {
  article: Article | null; admin: boolean; onSaved: (id: string) => void; onDeleted: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [id, setId] = useState(article?.id ?? "");
  const [keywords, setKeywords] = useState(article?.keywords.join(", ") ?? "");
  const [steps, setSteps] = useState(article?.steps.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    const row = {
      title: title.trim(),
      keywords: keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    if (row.steps.length > 10) { setError("Keep it to 10 steps or fewer."); return; }
    setBusy(true);
    setError("");
    try {
      if (article) await api(`/rest/v1/kb_articles?id=eq.${encodeURIComponent(article.id)}`, { method: "PATCH", body: row, prefer: "return=minimal" });
      else await api("/rest/v1/kb_articles", { method: "POST", body: { id: id.trim(), ...row }, prefer: "return=minimal" });
      onSaved(article?.id ?? id.trim());
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  async function remove() {
    if (!article) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await api(`/rest/v1/kb_articles?id=eq.${encodeURIComponent(article.id)}`, { method: "DELETE", prefer: "return=minimal" });
      onDeleted();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="box">
      <div className="lbl" style={{ marginBottom: 14 }}>{article ? (admin ? "Edit article" : "Article") : "New article"}</div>
      <form className="form" onSubmit={save}>
        <div className="two">
          <div><label>Title</label><input maxLength={120} required readOnly={!admin} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label>ID (lowercase, used by the agent)</label>
            <input pattern="[a-z0-9-]{2,40}" required readOnly={!admin || !!article} value={id} onChange={(e) => setId(e.target.value)} /></div>
        </div>
        <div><label>Keywords (comma separated)</label><input readOnly={!admin} value={keywords} onChange={(e) => setKeywords(e.target.value)} /></div>
        <div><label>Steps (one per line, up to 10)</label>
          <textarea style={{ minHeight: 220 }} required readOnly={!admin} value={steps} onChange={(e) => setSteps(e.target.value)} /></div>
        {admin && (
          <div className="row">
            <button disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            {article && <button type="button" className="s" onClick={remove}>{confirmDelete ? "Click again to delete" : "Delete"}</button>}
          </div>
        )}
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}

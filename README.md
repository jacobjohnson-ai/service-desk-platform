# Service Desk Platform

A ticketing system, demoed with a fictional company (Northwind), with logins, three roles, an AI helpdesk agent, and permissions enforced inside the database.

**Live demo:** https://jacobjohnson-ai.github.io/service-desk-platform/ (one-click demo logins, no sign-up)

## What each role can do

| Role | Can do |
|---|---|
| **Employee** | Chat with the IT helpdesk agent, submit tickets, follow and reply on their own tickets only |
| **Technician** | Work the full queue: assign, start work, resolve or reopen, reply, add internal notes, see the audit log, read the knowledge base |
| **Admin** | Everything a technician can do, plus team stats and adding, editing, and deleting knowledge base articles |

## Security

- **Row-level security in Postgres.** Each rule lives in the database, not the page. An employee who edits the page code or calls the API directly still only gets their own tickets.
- **Column-level grants.** Employees can create tickets but can't change status, assignment, or priority.
- **Internal notes** are hidden from employees by a database policy.
- **Audit log** written only by database triggers: ticket created, status changed, assigned, reply, internal note. Nobody can edit it.
- **Public sign-ups are off.** Only the three demo accounts exist.
- The browser only has the public key. The secret key lives in the agent's Cloudflare settings.

## The AI agent

Employees chat with the [IT Helpdesk Agent](https://github.com/jacobjohnson-ai/it-helpdesk-agent) (Google Gemini with function calling, on a Cloudflare Worker).

- The app sends the user's login token. The agent checks it with Supabase Auth and opens tickets under that account, so it never asks for a name or employee ID.
- It can only look up the signed-in user's own tickets.
- It reads troubleshooting steps from the `kb_articles` table, so an admin's edit reaches the agent within a minute.

## Response targets

Each ticket has a target time to first reply: **high 4 hours, medium 24, low 72**. The queue shows "Reply due in…" or "Reply overdue." The first technician reply is recorded by a trigger, and the admin view shows overdue tickets, average time to first reply, and average time to resolve.

## Stack

- **Frontend:** React 19 + TypeScript, built with Vite
- **Database and logins:** Supabase (Postgres, Auth, row-level security)
- **AI agent:** Cloudflare Workers + Google Gemini
- **Deploy:** GitHub Actions type-checks, builds, and publishes to GitHub Pages on every push

Everything runs on free tiers.

## Project layout

```
src/
  App.tsx                 sign-in state, loads profile and tickets
  lib/api.ts              Supabase Auth + REST client
  lib/format.ts           dates, status labels, response targets
  components/
    Login.tsx             demo role buttons and sign-in form
    EmployeeView.tsx      my tickets, agent chat, new ticket form
    StaffView.tsx         queue, filters, admin stats
    TicketDetail.tsx      conversation, internal notes, actions, audit log
    AgentChat.tsx         chat with the helpdesk agent
    KnowledgeBase.tsx     article list and editor
sql/
  01_service_desk.sql             roles, workflow, notes, audit log, security policies
  02_demo_users.sql               demo profiles
  03_kb_and_response_times.sql    knowledge base table, response tracking, stats view
```

## Run it locally

```
npm install
npm run dev
```

## Part of a set

1. [AI Support Ticket Triage](https://github.com/jacobjohnson-ai/ai-ticket-triage-n8n): n8n + Gemini classify incoming tickets
2. [Support Ticket Dashboard](https://github.com/jacobjohnson-ai/support-ticket-dashboard): SQL views and charts over the same database
3. [IT Helpdesk Agent](https://github.com/jacobjohnson-ai/it-helpdesk-agent): the AI agent used here
4. **Service Desk Platform** (this repo)

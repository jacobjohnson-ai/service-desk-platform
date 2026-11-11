// Shared state for a signed-in user: who they are, everyone's names, and the tickets they can see.
import { createContext, useContext } from "react";
import type { Profile, Ticket } from "./types";

export interface Desk {
  me: Profile;
  people: Record<string, Profile>;
  tickets: Ticket[];
  isStaff: boolean;
  reloadTickets: () => Promise<void>;
}

export const DeskContext = createContext<Desk | null>(null);

export function useDesk(): Desk {
  const d = useContext(DeskContext);
  if (!d) throw new Error("useDesk must be used inside DeskContext");
  return d;
}

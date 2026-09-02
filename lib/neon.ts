import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

// Don't throw here: this module is imported by client components that Next.js
// also renders once on the server (for the initial HTML shell) and during
// static generation, where env vars may legitimately be unset (e.g. CI
// builds that don't need a live Neon project). Falling back to a placeholder
// lets the build succeed; missing/invalid config then surfaces as a normal
// failed request, which the UI already reports through its error states.
if (!authUrl || !dataApiUrl) {
  console.warn(
    "Missing NEXT_PUBLIC_NEON_AUTH_URL or NEXT_PUBLIC_NEON_DATA_API_URL. " +
      "Copy .env.example to .env.local and fill in your Neon project's Auth and Data API URLs."
  );
}

const resolvedAuthUrl = authUrl || "https://neon-auth-not-configured.invalid/auth";
const resolvedDataApiUrl = dataApiUrl || "https://neon-data-api-not-configured.invalid/rest/v1";

export type Priority = "high" | "medium" | "low";

export type Contact = {
  id: string;
  user_id: string;
  name: string;
  company: string;
  role: string;
  met_at: string;
  notes: string;
  priority: Priority;
  created_at: string;
  updated_at: string;
};

type Database = {
  public: {
    Tables: {
      contacts: {
        Row: Contact;
        Insert: Partial<Pick<Contact, "id" | "user_id" | "created_at" | "updated_at">> &
          Pick<Contact, "name" | "priority"> &
          Partial<Pick<Contact, "company" | "role" | "met_at" | "notes">>;
        Update: Partial<Omit<Contact, "id" | "user_id">>;
      };
    };
  };
};

export const neon = createClient<Database>({
  auth: {
    url: resolvedAuthUrl,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: resolvedDataApiUrl,
  },
});

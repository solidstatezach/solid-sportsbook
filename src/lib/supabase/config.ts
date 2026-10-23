// Supabase is wired in but optional: when the two public env vars are
// missing (local dev, or before Zach creates the project) the app runs in
// local mode — board, slip, and bets all live in browser state, exactly
// like the original front-end.

export const isSupabaseEnabled = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

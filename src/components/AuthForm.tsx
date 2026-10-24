"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/");
          router.refresh();
          return;
        }
        setNotice("Account created — check your email to confirm it, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:px-6">
      <Link href="/" className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-200">
        ← Back to the board
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-lg shadow-black/30">
        <header className="bg-white/[0.03] px-5 py-4">
          <h1 className="text-base font-black uppercase tracking-wide text-zinc-50">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {isSignup
              ? "You start with $15 in play money. Bragging rights are earned from there."
              : "Log in to bet against the board — and your friends."}
          </p>
        </header>

        {!isSupabaseEnabled ? (
          <p className="px-5 py-6 text-sm leading-relaxed text-zinc-400">
            Accounts aren&apos;t connected yet. The book is still being set up — check back
            once sign-ups open.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
            {isSignup && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Display name
                </span>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you'll show on the leaderboard"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-50 outline-none placeholder:font-normal placeholder:text-zinc-600 focus:border-lime-300/60"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-50 outline-none placeholder:font-normal placeholder:text-zinc-600 focus:border-lime-300/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </span>
              <input
                required
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-lime-300/60"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-sm font-medium text-lime-200">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-lime-400 py-3 text-sm font-black uppercase tracking-wider text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.25)] transition-all hover:bg-lime-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
            >
              {busy ? "One sec…" : isSignup ? "Sign up" : "Log in"}
            </button>

            <p className="text-center text-xs text-zinc-500">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-lime-300 hover:underline">
                    Log in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link href="/signup" className="font-bold text-lime-300 hover:underline">
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

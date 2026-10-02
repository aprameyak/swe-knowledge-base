"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Panel } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        <Link href="/" className="mb-8 block text-center font-display text-3xl">
          Strand
        </Link>
        <Panel className="p-6 sm:p-8">
          <h1 className="font-display text-2xl">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Sign in to continue your career memory.
          </p>
          <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--danger)]">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
            No account?{" "}
            <Link href="/signup" className="text-[var(--accent)] hover:underline">
              Create one
            </Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}

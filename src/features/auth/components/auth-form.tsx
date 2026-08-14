"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabaseClient } from "@/lib/database/client";
import { Gem } from "lucide-react";

/**
 * Email + password auth via Supabase, run entirely client-side — signInWithPassword
 * and signUp both set the session cookie in the browser directly, which
 * middleware.ts then reads on the next navigation. No Server Action needed
 * for this; it's the standard Supabase Auth pattern.
 */
export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpDone, setSignUpDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const supabase = getBrowserSupabaseClient();

    if (mode === "signIn") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setIsPending(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      toast.success("Signed in");
      router.push(redirectTo);
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      setIsPending(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setSignUpDone(true);
    }
  }

  if (signUpDone) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-medium text-ink">Check your email</p>
        <p className="max-w-sm text-sm text-ink-muted">
          We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Click it, then come
          back and sign in.
        </p>
        <Button variant="outline" onClick={() => { setMode("signIn"); setSignUpDone(false); }}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Gem className="size-6 text-accent" />
        <h1 className="font-display text-xl font-medium text-ink">{mode === "signIn" ? "Sign in" : "Create an account"}</h1>
        <p className="text-sm text-ink-muted">Your wealth dashboard, protected by your own login.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="text-sm text-loss">{error}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Please wait…" : mode === "signIn" ? "Sign in" : "Sign up"}
        </Button>
      </form>

      <button
        onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(null); }}
        className="text-center text-sm text-ink-muted hover:text-ink"
      >
        {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

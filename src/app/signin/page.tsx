// Updated signin page: uses user ID instead of email, looks up email in user_ids table, and signs in with that email and password.
"use client";
import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SigninPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // 1. Look up email from user_ids table
    const { data, error: lookupError } = await supabase
      .from("user_ids")
      .select("user_id, user_uuid")
      .eq("user_id", userId)
      .single();
    if (lookupError || !data) {
      setError("User ID not found");
      setLoading(false);
      return;
    }
    const email = `${userId}@brainwormed.local`;
    // 2. Sign in with email and password
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
    else router.push("/");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <form
        onSubmit={handleSignin}
        className="flex flex-col gap-4 w-80"
        style={{ fontFamily: "inherit", color: "inherit" }}
      >
        <input
          className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-lg"
          type="text"
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          required
          autoFocus
        />
        <input
          className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] focus:outline-none focus:border-[#3b2f1c] text-lg"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          className="p-2 rounded border border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] font-bold text-lg hover:bg-[#ede3c2] transition disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error && <div className="text-red-600 text-center">{error}</div>}
        <div className="text-sm mt-2">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </form>
    </main>
  );
} 
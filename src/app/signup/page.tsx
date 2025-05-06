// Updated signup page: uses random user ID instead of email, stores mapping in user_ids table, and shows user their ID.
"use client";
import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

function generateUserId() {
  // e.g. user_x7k2p9
  return (
    "user_" +
    Math.random().toString(36).slice(2, 8) +
    Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  );
}

export default function SignupPage() {
  const [userId] = useState(generateUserId());
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = `${userId}@brainwormed.local`;
    // 1. Create Supabase user
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message || "Signup failed");
      setLoading(false);
      return;
    }
    // 2. Store mapping in user_ids table
    const { error: insertError } = await supabase.from("user_ids").insert([
      { user_id: userId, user_uuid: data.user.id },
    ]);
    if (insertError) {
      setError("Signup succeeded but failed to save user ID mapping. Contact support.");
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    // Optionally, redirect to signin after a delay
    setTimeout(() => router.push("/signin"), 3000);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <form
        onSubmit={handleSignup}
        className="flex flex-col gap-4 w-80"
        style={{ fontFamily: "inherit", color: "inherit" }}
      >
        <div className="mb-2 text-base text-center">
          <div className="mb-1">Your user ID:</div>
          <div className="font-bold text-lg select-all p-2 border border-[#bfae8e] rounded bg-[#f4ecd8] text-[#3b2f1c]">{userId}</div>
          <div className="text-xs mt-1 text-[#7c6a4d]">Save this ID! You will need it to log in.</div>
        </div>
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
          {loading ? "Signing up..." : "Sign Up"}
        </button>
        {error && <div className="text-red-600 text-center">{error}</div>}
        {success && <div className="text-green-700 text-center">Signup successful! Redirecting…</div>}
        <div className="text-sm mt-2">
          Already have an account?{" "}
          <Link href="/signin" className="underline">
            Sign in
          </Link>
        </div>
      </form>
    </main>
  );
} 
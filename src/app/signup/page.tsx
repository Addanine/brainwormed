// Created signup page for Supabase Auth.
"use client";
import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.push("/signin");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <form onSubmit={handleSignup} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold mb-2">Sign Up</h1>
        <input
          className="p-2 rounded text-black"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="p-2 rounded text-black"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white p-2 rounded" type="submit">
          Sign Up
        </button>
        {error && <div className="text-red-400">{error}</div>}
      </form>
    </main>
  );
} 
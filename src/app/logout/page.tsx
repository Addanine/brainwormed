// Created /logout page: signs out user with Supabase Auth and redirects to home.
"use client";
import { useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.signOut().then(() => {
      router.replace("/");
    });
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center font-mono text-[#3b2f1c]">
      <div className="text-lg">Logging out…</div>
    </main>
  );
} 
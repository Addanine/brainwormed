// Updated home page: show /settings and /logout if signed in, hide /signup and /signin if signed in. Uses Supabase client session detection.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import NavBar from "../components/NavBar";

export default function HomePage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  return (
    <>
      <NavBar />
      <main className="min-h-screen w-full bg-[#f4ecd8] font-mono text-[#3b2f1c] relative">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <nav className="flex flex-col gap-4 text-xl mt-12">
            <Link href="/compare">/compare</Link>
            <Link href="/hormones">/hormones</Link>
            {signedIn ? (
              <>
                <Link href="/settings">/settings</Link>
                <Link href="/logout">/logout</Link>
              </>
            ) : (
              <>
                <Link href="/signup">/signup</Link>
                <Link href="/signin">/signin</Link>
              </>
            )}
            <a href="https://twitter.com/endocrinemoder" target="_blank" rel="noopener noreferrer">https://twitter.com/endocrinemoder</a>
          </nav>
        </div>
      </main>
    </>
  );
}

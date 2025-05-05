// Created main page with three lowercase links: /compare, /hormones, and https://twitter.com/endocrinemoder.
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black">
      <nav className="flex flex-col gap-6 text-2xl font-mono lowercase">
        <Link href="/compare" className="text-blue-600 dark:text-blue-400 hover:underline">/compare</Link>
        <Link href="/hormones" className="text-blue-600 dark:text-blue-400 hover:underline">/hormones</Link>
        <a href="https://twitter.com/endocrinemoder" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://twitter.com/endocrinemoder</a>
      </nav>
    </main>
  );
}

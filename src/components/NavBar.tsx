// NavBar.tsx: Minimal sepia/monospace navigation bar for brainwormed. Links to Home, Hormones, Settings. 'brainwormed' is a link to the home page. Shows 'a project of adenine.xyz' on the left. Highlights current page.
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/hormones", label: "Hormones" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      className="w-full flex items-center justify-between px-6 py-3 border-b border-[#bfae8e] bg-[#f4ecd8] text-[#3b2f1c] font-mono"
      style={{ minHeight: 60 }}
    >
      <div className="flex flex-col items-start">
        <Link href="/" className="text-2xl font-bold tracking-widest lowercase leading-none hover:underline focus:underline">
          brainwormed
        </Link>
        <span className="text-xs mt-1 lowercase">
          a project of{' '}
          <a href="https://adenine.xyz" className="underline" target="_blank" rel="noopener noreferrer">
            adenine.xyz
          </a>
        </span>
      </div>
      <div className="flex gap-6 items-center">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-lg px-2 py-1 rounded transition-colors lowercase font-bold ${pathname === link.href ? 'bg-[#ede3c2]' : 'hover:bg-[#ede3c2]'}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
} 
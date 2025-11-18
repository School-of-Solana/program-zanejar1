"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import Image from "next/image";

function NavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/all-votes", label: "All Votes" },
    { href: "/create-vote", label: "Create Vote" },
  ];

  const linkClasses = (active: boolean) =>
    `px-4 py-2 text-sm font-medium transition-all ${
      active
        ? "text-foreground border-b-2 border-foreground"
        : "text-foreground/60 hover:text-foreground"
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10">
              <Image src="/logo.png" alt="DecentraVote" width={40} height={40} />
            </div>
            <span className="text-xl font-semibold text-foreground">DecentraVote</span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClasses(pathname.startsWith(item.href))}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Wallet Button */}
          <div>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavBar;

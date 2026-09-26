import Link from "next/link";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/navigate", label: "Navigate" },
  { href: "/assistant", label: "Assistant" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  return (
    <header className="nav">
      <Link href="/" className="brand">
        NYC Companion
      </Link>
      <nav>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

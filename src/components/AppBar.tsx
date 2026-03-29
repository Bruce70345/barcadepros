import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import NotificationBellLazy from "@/components/NotificationBellLazy";

export default function AppBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-md items-center justify-between px-5">
        <Link
          href="/"
          aria-label="Go to home"
          className="inline-flex items-center gap-3"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
            <Image
              src="/icons/PWALogo.png"
              alt="Barcade Pros logo"
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </span>
          <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            Barcade Pros
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBellLazy />
          <Link
            href="/edit"
            aria-label="Go to settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
          >
            <User size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}

"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import type { Role } from "@/lib/auth";

interface TopbarProps {
  userId: string;
  userLabel: string;
  userEmail: string;
  role: Role;
}

export function Topbar({ userId, userLabel, userEmail, role }: TopbarProps) {
  const initials =
    userLabel
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <GlobalSearch role={role} />
      <ThemeToggle />
      <NotificationsBell userId={userId} />
      <div
        title={userEmail}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
      >
        {initials}
      </div>
      <LogoutButton />
    </header>
  );
}

"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { SortDir } from "@/lib/sort";

// Encabezado de tabla ordenable. En páginas de servidor se usa con `href`
// (el orden vive en la URL); en tablas de cliente, con `onClick`.
export function SortableTh({
  label,
  active,
  dir,
  href,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  href?: string;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const content = (
    <span
      className={`inline-flex items-center gap-1 ${active ? "text-foreground" : ""} hover:text-foreground`}
    >
      {label}
      <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} />
    </span>
  );

  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {href ? (
        <Link href={href}>{content}</Link>
      ) : (
        <button type="button" onClick={onClick}>
          {content}
        </button>
      )}
    </th>
  );
}

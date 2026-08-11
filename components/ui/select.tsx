import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-md border border-border bg-background px-2 text-sm outline-none",
        "focus:ring-2 focus:ring-accent disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

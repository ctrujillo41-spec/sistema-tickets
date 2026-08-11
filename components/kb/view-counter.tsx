"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function ViewCounter({ articleId }: { articleId: string }) {
  const supabase = createClient();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    supabase.rpc("increment_kb_view", { p_article_id: articleId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  return null;
}

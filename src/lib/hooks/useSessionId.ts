"use client";

import { useEffect, useState } from "react";

export const useSessionId = () => {
  const [sid, setSid] = useState<string | null>(null);
  useEffect(() => {
    let existing = localStorage.getItem("smtraders:sid");
    if (!existing) {
      existing = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("smtraders:sid", existing);
    }
    setSid(existing);
  }, []);
  return sid;
};
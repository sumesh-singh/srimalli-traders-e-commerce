"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";

export const LoginForm = () => {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const registered = search.get("registered");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: "/checkout",
      });
      if (error?.code) {
        toast.error("Invalid email or password. Please make sure you have already registered an account and try again.");
        return;
      }
      const redirect = search.get("redirect") || "/";
      router.push(redirect);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {registered && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 text-green-800 text-sm px-3 py-2">
          Account created! Please login to continue.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4 bg-white/60 dark:bg-white/5 backdrop-blur rounded-lg border border-border p-6">
        <div className="space-y-1">
          <div className="text-sm font-medium">Email</div>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">Password</div>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="off" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 select-none">
            <input type="checkbox" className="h-4 w-4" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>
          <Link href="/register" className="text-orange-600 hover:underline">Create account</Link>
        </div>
        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
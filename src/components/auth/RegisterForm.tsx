"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";

export const RegisterForm = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({ email, name, password });
      if (error?.code) {
        toast.error(error.code === "USER_ALREADY_EXISTS" ? "Email already registered" : "Registration failed");
        return;
      }
      toast.success("Account created! Please login.");
      router.push("/login?registered=true");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={onSubmit} className="space-y-4 bg-white/60 dark:bg-white/5 backdrop-blur rounded-lg border border-border p-6">
        <div className="space-y-1">
          <div className="text-sm font-medium">Name</div>
          <Input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">Email</div>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">Password</div>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="off" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">Confirm password</div>
          <Input type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="off" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link href="/login" className="text-orange-600 hover:underline">Sign in</Link>
        </div>
        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
};

export default RegisterForm;
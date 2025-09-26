"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";

function useSessionId() {
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
}

export const Navbar = () => {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const sessionId = useSessionId();
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (!sessionId) return;
      try {
        const res = await fetch("/api/cart/items", {
          headers: { "x-session-id": sessionId },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const count = items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
        setCartCount(count);
      } catch {}
    };
    fetchCount();
  }, [sessionId]);

  const handleSignOut = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
    const { error } = await authClient.signOut({
      fetchOptions: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    });
    if (!error?.code) {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-bold text-orange-600 text-lg">SM Traders</Link>
        <nav className="ml-4 hidden sm:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-orange-600">Home</Link>
          <Link href="/products" className="hover:text-orange-600">Products</Link>
          <Link href="/wholesale/register" className="hover:text-orange-600">Wholesale</Link>
          {session?.user && (
            <Link href="/orders" className="hover:text-orange-600">Orders</Link>
          )}
          {(session as any)?.user?.role === "admin" && (
            <Link href="/admin" className="hover:text-orange-600">Admin</Link>
          )}
          <Link href="/cart" className="hover:text-orange-600">Cart</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/cart" className="relative inline-flex items-center justify-center p-2 rounded-md hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-orange-600 text-white">
                {cartCount}
              </span>
            )}
          </Link>
          {isPending ? null : session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-muted-foreground">Hi, {session.user.name || session.user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button className="bg-orange-500 hover:bg-orange-600" size="sm">Sign up</Button></Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
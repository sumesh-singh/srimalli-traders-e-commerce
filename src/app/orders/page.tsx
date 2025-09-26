"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login?redirect=/orders");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    const load = async () => {
      if (!session?.user) return;
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
        const res = await fetch("/api/orders", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch (e: any) {
        setError(e?.message || "Unable to load orders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Orders</h1>
        <Link href="/products"><Button variant="outline">Continue Shopping</Button></Link>
      </div>

      {isPending || loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No orders yet. <Link href="/products" className="text-orange-600 hover:underline">Browse products</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Order #{o.id}</CardTitle>
                <Badge className="bg-blue-600">{o.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-2 p-6">
                <div className="text-sm text-muted-foreground">Placed on {new Date(o.createdAt).toLocaleString()}</div>
                <div className="text-sm font-medium">Total: ₹{o.total}</div>
                {o.items && o.items.length > 0 && (
                  <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm">
                    {o.items.slice(0, 4).map((it) => (
                      <div key={it.id} className="flex items-center justify-between">
                        <span className="truncate">{it.name} × {it.quantity}</span>
                        <span>₹{it.price}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Link href={`/api/orders/${o.id}`} className="text-orange-600 hover:underline text-sm">View receipt</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
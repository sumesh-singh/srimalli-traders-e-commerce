"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem { id: number; name: string; quantity: number; price: number }
interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  user?: { id: number; name?: string; email?: string };
  items?: OrderItem[];
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isPending) {
      const role = (session as any)?.user?.role;
      if (!session?.user || role !== "admin") {
        router.push("/login?redirect=/admin/orders");
      }
    }
  }, [isPending, session, router]);

  const load = async () => {
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch(`/api/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleStatus = async (orderId: number, status: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch(`/api/orders/${orderId}?id=${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      await load();
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          <Input placeholder="Search by id, email, status" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
      </div>

      {isPending || loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No orders found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Order #{o.id}</CardTitle>
                <Badge>{o.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="text-sm text-muted-foreground">
                  {o.user?.name || o.user?.email || "Walk-in"} • {new Date(o.createdAt).toLocaleString()}
                </div>
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
                <div className="flex items-center gap-2 pt-3">
                  <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "paid")}>Mark Paid</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "shipped")}>Mark Shipped</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "delivered")}>Mark Delivered</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatus(o.id, "cancelled")}>Cancel</Button>
                  <Link href={`/api/orders/${o.id}?id=${o.id}`} className="text-orange-600 hover:underline text-sm ml-auto">View receipt</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
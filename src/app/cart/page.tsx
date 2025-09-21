"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSessionId } from "@/lib/hooks/useSessionId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CartItem = {
  id: number;
  productId: number;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  priceType: "retail" | "wholesale";
  total: number;
};

type CartResponse = {
  id: number;
  userId?: number | null;
  sessionId?: string | null;
  items: CartItem[];
  totals: { subtotal: number; tax: number; total: number };
} | null;

export default function CartPage() {
  const sessionId = useSessionId();
  const [data, setData] = useState<CartResponse>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/items", { headers: { "x-session-id": sessionId } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load cart");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, [sessionId]);

  const handleUpdateQty = async (itemId: number, nextQty: number) => {
    if (!sessionId || nextQty <= 0) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cart/items?id=${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({ quantity: nextQty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update item");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to update item");
    } finally { setLoading(false); }
  };

  const handleRemove = async (itemId: number) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cart/items?id=${itemId}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to remove item");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to remove item");
    } finally { setLoading(false); }
  };

  const itemCount = useMemo(() => data?.items?.reduce((acc, it) => acc + it.quantity, 0) ?? 0, [data]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <Link href="/products"><Button variant="outline">Continue Shopping</Button></Link>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Items ({itemCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (!data || data.items?.length === 0) && (
              <div className="text-sm text-muted-foreground">Loading cart…</div>
            )}

            {data && data.items && data.items.length > 0 ? (
              data.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-muted-foreground">Type: {it.priceType} • ₹{it.unitPrice} each</div>
                    <div className="text-xs text-muted-foreground">Line: ₹{it.total}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateQty(it.id, it.quantity - 1)} disabled={loading || it.quantity <= 1}>-</Button>
                    <Input className="w-14 text-center" type="number" value={it.quantity} onChange={(e) => handleUpdateQty(it.id, Math.max(1, parseInt(e.target.value || "1", 10)))} />
                    <Button variant="outline" size="sm" onClick={() => handleUpdateQty(it.id, it.quantity + 1)} disabled={loading}>+</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(it.id)} disabled={loading}>Remove</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Your cart is empty.</div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Link href="/products"><Button variant="outline">Add more</Button></Link>
          </CardFooter>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{data?.totals?.subtotal?.toFixed?.(2) ?? "0.00"}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>₹{data?.totals?.tax?.toFixed?.(2) ?? "0.00"}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹{data?.totals?.total?.toFixed?.(2) ?? "0.00"}</span></div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Link href="/checkout" className="w-full">
              <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={!data || (data?.items?.length ?? 0) === 0 || loading}>
                Proceed to Checkout
              </Button>
            </Link>
            <div className="text-xs text-muted-foreground">Checkout requires login for payment. You'll be prompted if not signed in.</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
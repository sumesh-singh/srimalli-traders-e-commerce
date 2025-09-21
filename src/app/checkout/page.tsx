"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionId } from "@/lib/hooks/useSessionId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Minimal shapes based on existing APIs
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
  items: CartItem[];
  totals: { subtotal: number; tax: number; total: number };
} | null;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const sessionId = useSessionId();
  const [cart, setCart] = useState<CartResponse>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingAddressId, setShippingAddressId] = useState<string>("");
  const [billingAddressId, setBillingAddressId] = useState<string>("");
  const [ageVerified, setAgeVerified] = useState(false);

  // Load cart
  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cart/items", { headers: { "x-session-id": sessionId } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load cart");
        setCart(json);
      } catch (e: any) {
        setError(e.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  // Load Razorpay script
  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const itemCount = useMemo(() => cart?.items?.reduce((a, i) => a + i.quantity, 0) ?? 0, [cart]);

  const handlePlaceOrder = async () => {
    if (!cart || (cart.items?.length ?? 0) === 0) return;
    if (!shippingAddressId) {
      setError("Please enter a valid shipping address ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/checkout/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.id,
          amount: cart.totals.total,
          currency: "INR",
          shippingAddressId: Number(shippingAddressId),
          billingAddressId: billingAddressId ? Number(billingAddressId) : undefined,
          ageVerified,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create order");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || (globalThis as any).NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!window.Razorpay || !keyId) {
        // Fallback: show inline message instead of alert and keep user on page
        setError(`Order created. Razorpay Order ID: ${data.razorpayOrderId}. Payment gateway unavailable. Please try again later.`);
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round((cart.totals.total || 0) * 100),
        currency: "INR",
        name: "Sri Mallikarjuna Traders",
        description: "Order Payment",
        order_id: data.razorpayOrderId,
        handler: function () {
          router.push("/orders");
        },
        prefill: {},
        theme: { color: "#ea580c" },
        modal: { ondismiss: () => router.push("/") },
      } as any;

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <Link href="/cart"><Button variant="outline">Back to Cart</Button></Link>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Shipping & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shipId">Shipping Address ID</Label>
                <Input id="shipId" placeholder="e.g., 1" value={shippingAddressId} onChange={(e) => setShippingAddressId(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Use an existing address ID from your account.</p>
              </div>
              <div>
                <Label htmlFor="billId">Billing Address ID (optional)</Label>
                <Input id="billId" placeholder="e.g., 1" value={billingAddressId} onChange={(e) => setBillingAddressId(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} />
              I confirm I am 18+ and eligible to purchase age-restricted items.
            </label>
          </CardContent>
          <CardFooter className="justify-end">
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handlePlaceOrder} disabled={loading || !cart || (cart.items?.length ?? 0) === 0}>
              {loading ? "Processing…" : "Pay with Razorpay"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Order Summary ({itemCount})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{cart?.totals?.subtotal?.toFixed?.(2) ?? "0.00"}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>₹{cart?.totals?.tax?.toFixed?.(2) ?? "0.00"}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹{cart?.totals?.total?.toFixed?.(2) ?? "0.00"}</span></div>
          </CardContent>
          <CardFooter className="justify-between">
            <Link href="/products" className="text-sm text-muted-foreground">Continue shopping</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: number;
  slug: string;
  name: string;
  stock: number;
  unit?: string;
  price?: { retail: number; wholesale?: number };
  category?: { name: string };
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) {
      const role = (session as any)?.user?.role;
      if (!session?.user || role !== "admin") {
        router.push("/login?redirect=/admin/products");
      }
    }
  }, [isPending, session, router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch(`/api/products${q ? `?q=${encodeURIComponent(q)}&pageSize=50` : "?pageSize=50"}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      const list = Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
    } catch (e: any) {
      setError(e?.message || "Unable to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by name, sku, category" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={load}>Search</Button>
          <Link href="/products"><Button className="bg-orange-500 hover:bg-orange-600">View Store</Button></Link>
        </div>
      </div>

      {isPending || loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No products found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base truncate">{p.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">#{p.id}</Badge>
                  {typeof p.stock === "number" && (
                    <Badge className={p.stock > 0 ? "bg-blue-600" : "bg-destructive"}>{p.stock} {p.unit || "pcs"}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-4 text-sm">
                <div className="text-muted-foreground">Slug: {p.slug}</div>
                <div className="text-muted-foreground">Category: {p.category?.name || "—"}</div>
                <div className="font-medium ml-auto">₹{p.price?.retail ?? "—"}{p.price?.wholesale ? ` • W: ₹${p.price.wholesale}` : ""}</div>
                <Link href={`/products/${p.slug}`} className="text-orange-600 hover:underline">Open</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
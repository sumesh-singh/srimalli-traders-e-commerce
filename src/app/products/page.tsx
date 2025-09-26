import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";

async function getProducts(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  if (typeof searchParams.q === "string") params.set("q", searchParams.q);
  if (typeof searchParams.category === "string") params.set("category", searchParams.category);
  if (typeof searchParams.sort === "string") params.set("sort", searchParams.sort);
  params.set("pageSize", "24");

  // Build absolute base URL for server-side fetch
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;

  try {
    const res = await fetch(`${base}/api/products?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return { products: [] };
    return res.json();
  } catch {
    return { products: [] };
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { products = [] } = await getProducts(searchParams);

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/"><Button variant="outline">Back to Home</Button></Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p: any) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="p-0">
                <Link href={`/products/${p.slug}`}>
                  <div className="relative w-full h-48 bg-muted">
                    {p.image?.url ? (
                      <Image src={p.image.url} alt={p.image.alt || p.name} fill className="object-cover" />
                    ) : (
                      <Image src="https://images.unsplash.com/photo-1447426732136-994b56f37f4f?q=80&w=1200&auto=format&fit=crop" alt={p.name} fill className="object-cover" />
                    )}
                  </div>
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <CardTitle className="text-base line-clamp-2 mb-1">{p.name}</CardTitle>
                <div className="text-sm text-muted-foreground line-clamp-2">{p.description}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold text-orange-600">₹{p.price?.retail ?? p.retailPrice}</span>
                  {p.price?.wholesale !== undefined && (
                    <Badge className="bg-blue-600">Wholesale ₹{p.price.wholesale}</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Link href={`/products/${p.slug}`} className="w-full"><Button className="w-full bg-orange-500 hover:bg-orange-600">View</Button></Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
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

async function getCategories() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  try {
    const res = await fetch(`${base}/api/categories`, { cache: "no-store" });
    if (!res.ok) return { categories: [] };
    return res.json();
  } catch {
    return { categories: [] };
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { products = [] } = await getProducts(searchParams);
  const { categories = [] } = await getCategories();

  const currentCategory = typeof searchParams.category === "string" ? searchParams.category : "all";
  const currentSort = typeof searchParams.sort === "string" ? searchParams.sort : "created_at";
  const currentInStock = typeof searchParams.inStock === "string" ? searchParams.inStock : null;
  const currentWholesaleOnly = typeof searchParams.wholesaleOnly === "string" ? searchParams.wholesaleOnly : null;
  const currentMin = typeof searchParams.minPrice === "string" ? searchParams.minPrice : null;
  const currentMax = typeof searchParams.maxPrice === "string" ? searchParams.maxPrice : null;

  const buildHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (typeof searchParams.q === "string") params.set("q", searchParams.q);
    if (typeof searchParams.category === "string") params.set("category", searchParams.category);
    if (typeof searchParams.sort === "string") params.set("sort", searchParams.sort);
    if (typeof searchParams.inStock === "string") params.set("inStock", searchParams.inStock);
    if (typeof searchParams.wholesaleOnly === "string") params.set("wholesaleOnly", searchParams.wholesaleOnly);
    if (typeof searchParams.minPrice === "string") params.set("minPrice", searchParams.minPrice);
    if (typeof searchParams.maxPrice === "string") params.set("maxPrice", searchParams.maxPrice);
    // apply overrides
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === null) params.delete(k);
      else params.set(k, v);
    });
    return `/products${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/"><Button variant="outline">Back to Home</Button></Link>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          <span className="text-muted-foreground">Sort:</span>
          <Link href={buildHref({ sort: "created_at" })} className={`px-2 py-1 rounded-md border ${currentSort === "created_at" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>Newest</Link>
          <Link href={buildHref({ sort: "name" })} className={`px-2 py-1 rounded-md border ${currentSort === "name" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>Name</Link>
          <Link href={buildHref({ sort: "price" })} className={`px-2 py-1 rounded-md border ${currentSort === "price" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>Price</Link>
        </div>
        {currentCategory !== "all" && (
          <Link href={buildHref({ category: null })} className="text-sm text-orange-600 hover:underline">Clear category</Link>
        )}
      </div>

      {/* Layout with sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <aside className="md:col-span-3">
          <div className="sticky top-20 space-y-2">
            <div className="text-sm font-medium mb-2">Categories</div>
            <Link href={buildHref({ category: null })} className={`block px-3 py-2 rounded-md text-sm ${currentCategory === "all" ? "bg-orange-500 text-white" : "hover:bg-muted"}`}>All</Link>
            {categories.map((c: any) => (
              <Link key={c.slug} href={buildHref({ category: c.slug })} className={`block px-3 py-2 rounded-md text-sm flex items-center justify-between ${currentCategory === c.slug ? "bg-orange-500 text-white" : "hover:bg-muted"}`}>
                <span className="truncate">{c.name}</span>
                <span className="text-xs opacity-70">{c.productCount}</span>
              </Link>
            ))}

            <div className="mt-5 pt-3 border-t border-border space-y-2">
              <div className="text-sm font-medium">Filters</div>
              <div className="flex flex-wrap gap-2">
                <Link href={buildHref({ inStock: currentInStock === "true" ? null : "true" })} className={`px-2 py-1 rounded-md border text-xs ${currentInStock === "true" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>In Stock</Link>
                <Link href={buildHref({ wholesaleOnly: currentWholesaleOnly === "true" ? null : "true" })} className={`px-2 py-1 rounded-md border text-xs ${currentWholesaleOnly === "true" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>Wholesale only</Link>
              </div>
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="flex flex-wrap gap-2">
                <Link href={buildHref({ minPrice: null, maxPrice: "500" })} className={`px-2 py-1 rounded-md border text-xs ${currentMin === null && currentMax === "500" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>Under ₹500</Link>
                <Link href={buildHref({ minPrice: "500", maxPrice: "1000" })} className={`px-2 py-1 rounded-md border text-xs ${currentMin === "500" && currentMax === "1000" ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>₹500–₹1000</Link>
                <Link href={buildHref({ minPrice: "1000", maxPrice: null })} className={`px-2 py-1 rounded-md border text-xs ${currentMin === "1000" && currentMax === null ? "bg-orange-500 text-white border-orange-600" : "hover:bg-muted"}`}>₹1000+</Link>
                {(currentMin || currentMax) && (
                  <Link href={buildHref({ minPrice: null, maxPrice: null })} className="px-2 py-1 rounded-md border text-xs hover:bg-muted">Clear price</Link>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="md:col-span-9">
          {products.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No products found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p: any) => (
                <Card key={p.id} className="flex flex-col bg-white/5 border-white/10 backdrop-blur-md hover:translate-y-0.5 hover:shadow-lg transition">
                  <CardHeader className="p-0">
                    <Link href={`/products/${p.slug}`}>
                      <div className="relative w-full h-48 bg-muted overflow-hidden rounded-lg">
                        {p.image?.url ? (
                          <Image src={p.image.url} alt={p.image.alt || p.name} fill className="object-cover transition-transform duration-500 ease-out hover:scale-110" />
                        ) : (
                          <Image src="https://images.unsplash.com/photo-1447426732136-994b56f37f4f?q=80&w=1200&auto=format&fit=crop" alt={p.name} fill className="object-cover transition-transform duration-500 ease-out hover:scale-110" />
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
        </main>
      </div>
    </div>
  );
}
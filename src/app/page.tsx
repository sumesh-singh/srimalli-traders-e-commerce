"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "locomotive-scroll/dist/locomotive-scroll.css";

type Category = {
  id: number;
  name: string;
  slug: string;
  requiresAgeVerification: boolean;
  productCount: number;
  children?: Category[];
};

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sku: string;
  stock: number;
  unit: string;
  tags: string[];
  price: { retail: number; wholesale?: number; minWholesaleQty?: number; taxRate: number };
  image?: { url: string; alt: string };
  category: { id: number; name: string; slug: string; requiresAgeVerification: boolean };
};

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

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("created_at");
  const sessionId = useSessionId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let scroll: any;
    (async () => {
      const mod = await import("locomotive-scroll");
      const LocomotiveScroll = mod.default;
      if (containerRef.current) {
        scroll = new LocomotiveScroll({
          el: containerRef.current,
          smooth: true,
          smartphone: { smooth: true },
          tablet: { smooth: true },
        });
      }
    })();
    return () => {
      if (scroll) scroll.destroy();
    };
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category !== "all") params.set("category", category);
    params.set("sort", sort);
    params.set("pageSize", "12");
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {});
  }, [search, category, sort]);

  const flatCategories = useMemo(() => {
    const list: Category[] = [];
    const walk = (nodes?: Category[]) => nodes?.forEach((c) => { list.push(c); walk(c.children); });
    walk(categories);
    return list;
  }, [categories]);

  const addToCart = async (productId: number, priceType: "retail" | "wholesale") => {
    if (!sessionId) return;
    await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sessionId },
      body: JSON.stringify({ productId, quantity: 1, priceType }),
    });
  };

  return (
    <div ref={containerRef} data-scroll-container className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Top promo bar */}
      <div className="w-full bg-orange-500/80 backdrop-blur-sm text-white text-center text-sm py-2 px-4 border-b border-white/10">
        Diwali Specials live now! Retail up to 15% off and Wholesale bundle savings.
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden" data-scroll-section>
        <Image
          src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2000&auto=format&fit=crop"
          alt="Fireworks celebration banner"
          width={2400}
          height={1200}
          priority
          data-scroll
          data-scroll-speed="-1"
          className="w-full h-[60vh] md:h-[72vh] object-cover will-change-transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" data-scroll data-scroll-speed="-0.5" />
        <div
          className="absolute inset-0 max-w-6xl mx-auto px-4 flex flex-col justify-center gap-4"
          data-scroll
          data-scroll-speed="0.2"
        >
          <div className="max-w-xl rounded-xl bg-white/10 border border-white/20 backdrop-blur-md p-6 text-white shadow-lg">
            <h1 className="text-3xl sm:text-5xl font-bold">Sri Mallikarjuna Traders</h1>
            <p className="text-white/90 mt-2">
              Retail and Wholesale fireworks with dual pricing. Quality sparklers, rockets, flower pots, gift boxes and more.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/products"><Button className="bg-orange-500 hover:bg-orange-600">Shop Now</Button></Link>
              <Link href="#categories"><Button variant="outline" className="border-white/80 text-white hover:bg-white/20 hover:text-white">Browse Categories</Button></Link>
              <Link href="/cart"><Button variant="secondary" className="bg-white/90 text-orange-700 hover:bg-white">View Cart</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section id="categories" className="max-w-6xl mx-auto px-4 py-8" data-scroll-section>
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {flatCategories.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className="">
              <Card className="hover:shadow-md transition bg-white/5 dark:bg-white/5 border-white/10 backdrop-blur-md">
                <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.productCount} items</span>
                  {c.requiresAgeVerification && <Badge className="mt-1 bg-blue-600">18+</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products with search/sort */}
      <section className="max-w-6xl mx-auto px-4 pb-12" data-scroll-section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Featured Products</h2>
          <div className="flex gap-2 items-center">
            <Input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 bg-white/5 backdrop-blur-sm" />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44 bg-white/5 backdrop-blur-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col bg-white/5 border-white/10 backdrop-blur-md hover:translate-y-0.5 hover:shadow-lg transition">
              <CardHeader className="p-0">
                <Link href={`/products/${p.slug}`}>
                  <div className="group relative w-full h-48 bg-muted overflow-hidden rounded-lg">
                    {p.image?.url ? (
                      <Image src={p.image.url} alt={p.image.alt || p.name} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
                    ) : (
                      <Image src="https://images.unsplash.com/photo-1447426732136-994b56f37f4f?q=80&w=1200&auto=format&fit=crop" alt={p.name} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
                    )}
                  </div>
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <CardTitle className="text-base line-clamp-2 mb-1">{p.name}</CardTitle>
                <div className="text-sm text-muted-foreground line-clamp-2">{p.description}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold text-orange-600">₹{p.price.retail}</span>
                  {p.price.wholesale !== undefined && (
                    <Badge className="bg-blue-600">Wholesale ₹{p.price.wholesale}</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Button className="bg-orange-500/90 hover:bg-orange-600" onClick={() => addToCart(p.id, "retail")}>Add</Button>
                {p.price.wholesale !== undefined && (
                  <Button variant="outline" onClick={() => addToCart(p.id, "wholesale")}>Wholesale</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/products"><Button variant="outline">View all products</Button></Link>
        </div>
      </section>

      {/* Seasonal Promotion Strip */}
      <section className="bg-blue-600/80 backdrop-blur-md text-white" data-scroll-section>
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Seasonal Wholesale Combos</div>
            <div className="text-sm opacity-90">Extra ₹500 off on eligible bulk packs for approved wholesale accounts.</div>
          </div>
          <Link href="/products?category=wholesale-combos"><Button className="bg-white text-blue-700 hover:bg-white/90">Shop Combos</Button></Link>
        </div>
      </section>

      <footer className="text-center text-sm text-muted-foreground py-8" data-scroll-section>
        © {new Date().getFullYear()} Sri Mallikarjuna Traders. All rights reserved.
      </footer>
    </div>
  );
}
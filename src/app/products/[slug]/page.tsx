import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

async function getProduct(slug: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${base}/api/products/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.product ?? null;
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  const retail = product.price?.retail ?? product.retailPrice;
  const wholesale = product.price?.wholesale ?? product.wholesalePrice;

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold line-clamp-2">{product.name}</h1>
        <Link href="/products"><Button variant="outline">Back to Products</Button></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full aspect-[4/3] bg-muted">
              {product.image?.url ? (
                <Image src={product.image.url} alt={product.image.alt || product.name} fill className="object-cover" />
              ) : (
                <Image src="https://images.unsplash.com/photo-1447426732136-994b56f37f4f?q=80&w=1200&auto=format&fit=crop" alt={product.name} fill className="object-cover" />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">SKU: {product.sku || "N/A"}</div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p>{product.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-semibold text-orange-600">₹{retail}</div>
            {typeof wholesale === "number" && (
              <Badge className="bg-blue-600">Wholesale ₹{wholesale}</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {product.stock > 10 ? "In Stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of Stock"}
          </div>
          <div className="flex gap-2">
            {/* Add to cart buttons will be wired on client pages/components */}
            <Link href="/products"><Button className="bg-orange-500 hover:bg-orange-600">Continue Shopping</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
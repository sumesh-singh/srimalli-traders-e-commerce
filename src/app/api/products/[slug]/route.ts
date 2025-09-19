import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, productPrices, productImages, productVariants, categories } from '@/db/schema';
import { eq, and, ne, desc, asc } from 'drizzle-orm';

// Helper function to parse tags from JSON string
function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug;

    if (!slug) {
      return NextResponse.json({ 
        error: "Product slug is required",
        code: "MISSING_SLUG" 
      }, { status: 400 });
    }

    // Fetch product with all related data
    const productData = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        sku: products.sku,
        stock: products.stock,
        unit: products.unit,
        tags: products.tags,
        status: products.status,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        requiresAgeVerification: categories.requiresAgeVerification,
        retailPrice: productPrices.retailPrice,
        wholesalePrice: productPrices.wholesalePrice,
        minWholesaleQty: productPrices.minWholesaleQty,
        taxRate: productPrices.taxRate
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .where(eq(products.slug, slug))
      .limit(1);

    if (productData.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productData[0];

    // Check if product is active
    if (product.status !== 'active') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch product images
    const images = await db
      .select({
        id: productImages.id,
        url: productImages.url,
        alt: productImages.alt,
        sortOrder: productImages.sortOrder
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder));

    // Fetch product variants if exist
    const variants = await db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        value: productVariants.value,
        priceModifier: productVariants.priceModifier,
        stockModifier: productVariants.stockModifier,
        sku: productVariants.sku
      })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id));

    // Fetch related products from same category
    const relatedProductsData = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        sku: products.sku,
        stock: products.stock,
        unit: products.unit,
        retailPrice: productPrices.retailPrice,
        wholesalePrice: productPrices.wholesalePrice,
        minWholesaleQty: productPrices.minWholesaleQty,
        taxRate: productPrices.taxRate,
        imageUrl: productImages.url,
        imageAlt: productImages.alt
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(productImages, and(eq(products.id, productImages.productId), eq(productImages.sortOrder, 0)))
      .where(
        and(
          eq(products.categoryId, product.categoryId),
          eq(products.status, 'active'),
          ne(products.id, product.id)
        )
      )
      .orderBy(desc(products.id))
      .limit(4);

    const response = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      sku: product.sku,
      stock: product.stock,
      unit: product.unit,
      tags: parseTags(product.tags),
      price: {
        retail: product.retailPrice || 0,
        wholesale: product.wholesalePrice,
        minWholesaleQty: product.minWholesaleQty,
        taxRate: product.taxRate || 0.18
      },
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt || `${product.name} image`,
        sortOrder: img.sortOrder
      })),
      variants: variants.length > 0 ? variants.map(variant => ({
        id: variant.id,
        name: variant.name,
        value: variant.value,
        priceModifier: variant.priceModifier,
        stockModifier: variant.stockModifier,
        sku: variant.sku
      })) : undefined,
      category: {
        id: product.categoryId,
        name: product.categoryName,
        slug: product.categorySlug,
        requiresAgeVerification: Boolean(product.requiresAgeVerification)
      },
      relatedProducts: relatedProductsData.map(related => ({
        id: related.id,
        slug: related.slug,
        name: related.name,
        sku: related.sku,
        stock: related.stock,
        unit: related.unit,
        retailPrice: related.retailPrice,
        wholesalePrice: related.wholesalePrice,
        minWholesaleQty: related.minWholesaleQty,
        image: related.imageUrl,
        alt: related.imageAlt
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Product detail fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch product details',
      code: "FETCH_ERROR" 
    }, { status: 500 });
  }
}
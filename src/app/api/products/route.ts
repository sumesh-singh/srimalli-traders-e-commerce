import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, productPrices, productImages, categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface ProductResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  sku: string;
  stock: number;
  unit: string;
  tags: string[];
  price: {
    retail: number;
    wholesale?: number;
    minWholesaleQty?: number;
    taxRate: number;
  };
  images: {
    url: string;
    alt: string;
  }[];
  category: {
    id: number;
    name: string;
    slug: string;
    requiresAgeVerification: boolean;
  };
}

// Define the params interface for the dynamic route
interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = params;
    
    // Get the product by slug
    const productData = await db.select({
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
      retailPrice: productPrices.retailPrice,
      wholesalePrice: productPrices.wholesalePrice,
      minWholesaleQty: productPrices.minWholesaleQty,
      taxRate: productPrices.taxRate,
      categoryName: categories.name,
      categorySlug: categories.slug,
      requiresAgeVerification: categories.requiresAgeVerification,
    })
      .from(products)
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.slug, slug),
          eq(products.status, 'active')
        )
      )
      .limit(1);

    if (productData.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productData[0];

    // Get all images for this product
    const images = await db.select({
      url: productImages.url,
      alt: productImages.alt
    })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.sortOrder);

    // Process the product data
    const processedProduct: ProductResponse = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      stock: product.stock || 0,
      unit: product.unit || 'piece',
      tags: product.tags ? JSON.parse(product.tags) : [],
      price: {
        retail: product.retailPrice || 0,
        wholesale: product.wholesalePrice || undefined,
        minWholesaleQty: product.minWholesaleQty || undefined,
        taxRate: product.taxRate || 0.18
      },
      images: images.map(img => ({
        url: img.url,
        alt: img.alt || ''
      })),
      category: {
        id: product.categoryId,
        name: product.categoryName || '',
        slug: product.categorySlug || '',
        requiresAgeVerification: Boolean(product.requiresAgeVerification)
      }
    };

    return NextResponse.json(processedProduct);
    
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

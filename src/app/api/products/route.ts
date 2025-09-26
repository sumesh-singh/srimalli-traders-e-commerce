import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, productPrices, productImages, categories } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';

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
  image?: {
    url: string;
    alt: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
    requiresAgeVerification: boolean;
  };
}

interface PaginatedResponse {
  products: ProductResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const offset = (page - 1) * pageSize;
    
    // Search and filter parameters
    const search = searchParams.get('q');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock'); // 'true' | 'false' | null
    const wholesaleOnly = searchParams.get('wholesaleOnly'); // 'true' | 'false' | null
    
    // Build where conditions
    const conditions = [eq(products.status, status)] as any[];
    
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.sku, `%${search}%`)
        )
      );
    }
    
    if (category) {
      // Check if category is slug or ID
      const isCategoryId = !isNaN(parseInt(category));
      if (isCategoryId) {
        conditions.push(eq(products.categoryId, parseInt(category)));
      } else {
        const categoryData = await db.select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, category))
          .limit(1);
        
        if (categoryData.length > 0) {
          conditions.push(eq(products.categoryId, categoryData[0].id));
        } else {
          // Return empty result if category not found
          return NextResponse.json({
            products: [],
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 0
            }
          });
        }
      }
    }

    // Additional filters
    if (minPrice && !isNaN(Number(minPrice))) {
      conditions.push(gte(productPrices.retailPrice, Number(minPrice)));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      conditions.push(lte(productPrices.retailPrice, Number(maxPrice)));
    }
    if (inStock === 'true') {
      conditions.push(gte(products.stock, 1));
    }
    if (wholesaleOnly === 'true') {
      conditions.push(sql`${productPrices.wholesalePrice} IS NOT NULL`);
    }
    
    // Build base query
    let baseQuery = db.select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      sku: products.sku,
      stock: products.stock,
      unit: products.unit,
      tags: products.tags,
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
      .where(and(...conditions));
    
    // Apply sorting
    const sortColumn = {
      'name': products.name,
      'price': productPrices.retailPrice,
      'created_at': products.createdAt
    }[sort] || products.createdAt;
    
    baseQuery = baseQuery.orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn));
    
    // Get total count
    const countResult = await db.select({
      count: sql<number>`count(*)`
    }).from(products)
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));
    
    const total = countResult[0]?.count || 0;
    
    // Get paginated results
    const rawProducts = await baseQuery.limit(pageSize).offset(offset);
    
    // Get first image for each product
    const productIds = rawProducts.map(p => p.id);
    let productImagesMap: Record<number, { url: string; alt: string }> = {};
    
    if (productIds.length > 0) {
      const images = await db.select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt
      })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder));
      
      images.forEach(img => {
        if (!productImagesMap[img.productId]) {
          productImagesMap[img.productId] = {
            url: img.url,
            alt: img.alt || ''
          };
        }
      });
    }
    
    // Process products
    const processedProducts: ProductResponse[] = rawProducts.map(product => {
      let parsedTags: string[] = [];
      try {
        if (product.tags && product.tags.trim().startsWith('[')) {
          parsedTags = JSON.parse(product.tags);
        }
      } catch {}
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        stock: product.stock || 0,
        unit: product.unit || 'piece',
        tags: parsedTags,
        price: {
          retail: product.retailPrice || 0,
          wholesale: product.wholesalePrice || undefined,
          minWholesaleQty: product.minWholesaleQty || undefined,
          taxRate: product.taxRate || 0.18
        },
        image: productImagesMap[product.id],
        category: {
          id: product.categoryId,
          name: product.categoryName || '',
          slug: product.categorySlug || '',
          requiresAgeVerification: Boolean(product.requiresAgeVerification)
        }
      };
    });
    
    return NextResponse.json({
      products: processedProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
    
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
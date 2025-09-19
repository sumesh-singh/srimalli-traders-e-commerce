import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories, products } from '@/db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Build the base query
    let baseQuery = db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        requiresAgeVerification: categories.requiresAgeVerification,
        isActive: categories.isActive,
      })
      .from(categories);

    // Apply active filter if needed
    if (!includeInactive) {
      baseQuery = baseQuery.where(eq(categories.isActive, true));
    }

    // Execute the query
    const categoryResults = await baseQuery.orderBy(
      asc(categories.sortOrder),
      asc(categories.name)
    );

    if (categoryResults.length === 0) {
      return NextResponse.json({ categories: [] });
    }

    // Get product counts for each category
    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)`.as('count')
      })
      .from(products)
      .groupBy(products.categoryId);

    // Create a map of categoryId to product count
    const productCountMap = new Map<number, number>();
    productCounts.forEach(pc => {
      productCountMap.set(pc.categoryId, pc.count);
    });

    // Build hierarchical structure
    const categoryMap = new Map<number, any>();
    const rootCategories: any[] = [];

    // First pass: create category objects
    categoryResults.forEach(category => {
      const catWithCount = {
        ...category,
        productCount: productCountMap.get(category.id) || 0,
        children: []
      };
      categoryMap.set(category.id, catWithCount);
    });

    // Second pass: build hierarchy
    categoryResults.forEach(category => {
      const catWithCount = categoryMap.get(category.id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(catWithCount);
        }
      } else {
        rootCategories.push(catWithCount);
      }
    });

    // Sort children by sortOrder and name
    const sortChildren = (categories: any[]) => {
      categories.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return a.name.localeCompare(b.name);
      });
      categories.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          sortChildren(cat.children);
        }
      });
    };

    sortChildren(rootCategories);

    // Remove empty children arrays and transform data
    const cleanCategories = (categories: any[]): any[] => {
      return categories.map(cat => {
        const cleaned = {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          parentId: cat.parentId,
          sortOrder: cat.sortOrder,
          requiresAgeVerification: Boolean(cat.requiresAgeVerification),
          productCount: cat.productCount
        };
        
        if (cat.children && cat.children.length > 0) {
          (cleaned as any).children = cleanCategories(cat.children);
        }
        
        return cleaned;
      });
    };

    return NextResponse.json({ categories: cleanCategories(rootCategories) });

  } catch (error) {
    console.error('GET categories error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
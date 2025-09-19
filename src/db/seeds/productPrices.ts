import { db } from '@/db';
import { productPrices } from '@/db/schema';

async function main() {
    const sampleProductPrices = [
        {
            productId: 1,
            retailPrice: 150,
            wholesalePrice: 120,
            minWholesaleQty: 20,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 2,
            retailPrice: 800,
            wholesalePrice: 650,
            minWholesaleQty: 10,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 3,
            retailPrice: 45,
            wholesalePrice: 35,
            minWholesaleQty: 50,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 4,
            retailPrice: 85,
            wholesalePrice: 70,
            minWholesaleQty: 50,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 5,
            retailPrice: 25,
            wholesalePrice: 20,
            minWholesaleQty: 100,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 6,
            retailPrice: 60,
            wholesalePrice: 45,
            minWholesaleQty: 50,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 7,
            retailPrice: 15,
            wholesalePrice: 12,
            minWholesaleQty: 200,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 8,
            retailPrice: 35,
            wholesalePrice: 28,
            minWholesaleQty: 100,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 9,
            retailPrice: 500,
            wholesalePrice: 400,
            minWholesaleQty: 5,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 10,
            retailPrice: 850,
            wholesalePrice: 700,
            minWholesaleQty: 3,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 11,
            retailPrice: 2500,
            wholesalePrice: 2000,
            minWholesaleQty: 2,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            productId: 12,
            retailPrice: 4500,
            wholesalePrice: 3800,
            minWholesaleQty: 1,
            taxRate: 0.18,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(productPrices).values(sampleProductPrices);
    
    console.log('✅ Product prices seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
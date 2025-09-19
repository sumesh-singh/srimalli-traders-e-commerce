import { db } from '@/db';
import { promotions } from '@/db/schema';

async function main() {
    const samplePromotions = [
        {
            name: 'Diwali Retail Special',
            description: 'Celebrate Diwali with 15% discount on all products exclusively for retail customers during the festive season',
            type: 'percentage',
            value: 15,
            categoryId: null,
            minOrderAmount: 500,
            maxDiscountAmount: 2000,
            userType: 'retail',
            startDate: '2024-10-15',
            endDate: '2024-11-15',
            isActive: true,
            usageLimit: 1000,
            usedCount: 32,
            createdAt: new Date('2024-10-01').toISOString(),
            updatedAt: new Date('2024-10-01').toISOString(),
        },
        {
            name: 'Firecrackers Festival Offer',
            description: 'Light up your Diwali celebrations with 20% off on all firecrackers and festive items',
            type: 'percentage',
            value: 20,
            categoryId: 1,
            minOrderAmount: 1000,
            maxDiscountAmount: 3000,
            userType: 'all',
            startDate: '2024-10-20',
            endDate: '2024-11-05',
            isActive: true,
            usageLimit: 1000,
            usedCount: 47,
            createdAt: new Date('2024-10-05').toISOString(),
            updatedAt: new Date('2024-10-05').toISOString(),
        },
        {
            name: 'Wholesale Bundle Promotion',
            description: 'Special Diwali wholesale promotion offering flat ₹500 off on bulk combo purchases for wholesale customers',
            type: 'fixed_amount',
            value: 500,
            categoryId: 6,
            minOrderAmount: 5000,
            maxDiscountAmount: 500,
            userType: 'wholesale',
            startDate: '2024-10-01',
            endDate: '2024-11-30',
            isActive: true,
            usageLimit: 1000,
            usedCount: 18,
            createdAt: new Date('2024-09-15').toISOString(),
            updatedAt: new Date('2024-09-15').toISOString(),
        },
        {
            name: 'Early Bird Diwali',
            description: 'Early bird special for the most eager celebrators - 10% off everything before the main season begins',
            type: 'percentage',
            value: 10,
            categoryId: null,
            minOrderAmount: 300,
            maxDiscountAmount: 1000,
            userType: 'all',
            startDate: '2024-09-01',
            endDate: '2024-09-30',
            isActive: false,
            usageLimit: 1000,
            usedCount: 41,
            createdAt: new Date('2024-08-15').toISOString(),
            updatedAt: new Date('2024-10-02').toISOString(),
        }
    ];

    await db.insert(promotions).values(samplePromotions);
    
    console.log('✅ Promotions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
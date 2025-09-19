import { db } from '@/db';
import { categories } from '@/db/schema';

async function main() {
    const sampleCategories = [
        {
            name: 'Firecrackers',
            slug: 'firecrackers',
            description: 'Traditional firecrackers and crackers including bombs, flowerpots, and aerial shells. Perfect for festivals and celebrations. Age verification required due to safety regulations.',
            parentId: null,
            sortOrder: 10,
            isActive: true,
            requiresAgeVerification: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Sparklers',
            slug: 'sparklers',
            description: 'Safe sparklers, fountains, and hand-held items suitable for all ages. Popular for birthdays, weddings, and small celebrations. No age verification required.',
            parentId: null,
            sortOrder: 20,
            isActive: true,
            requiresAgeVerification: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Flower Pots',
            slug: 'flower-pots',
            description: 'Ground-based fountains and flower pots that create beautiful patterns close to the ground. Safe for outdoor use with proper precautions.',
            parentId: null,
            sortOrder: 30,
            isActive: true,
            requiresAgeVerification: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Rockets',
            slug: 'rockets',
            description: 'Sky rockets and aerial fireworks that create spectacular displays in the sky. Must be used outdoors with proper safety measures.',
            parentId: null,
            sortOrder: 40,
            isActive: true,
            requiresAgeVerification: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Gift Boxes',
            slug: 'gift-boxes',
            description: 'Assorted firework gift sets and combo packs, perfect for gifting during festivals and celebrations. Mix of safe items suitable for all.',
            parentId: null,
            sortOrder: 50,
            isActive: true,
            requiresAgeVerification: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Wholesale Combos',
            slug: 'wholesale-combos',
            description: 'Bulk wholesale packages for retailers and large events. Significant discounts on large quantities with proper documentation required.',
            parentId: null,
            sortOrder: 60,
            isActive: true,
            requiresAgeVerification: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(categories).values(sampleCategories);
    
    console.log('✅ Categories seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
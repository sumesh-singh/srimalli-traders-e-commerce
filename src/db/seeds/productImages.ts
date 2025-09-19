import { db } from '@/db';
import { productImages } from '@/db/schema';

async function main() {
    const sampleImages = [
        // Product 1 - Firecrackers (red theme)
        {
            productId: 1,
            url: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Deluxe+Crackers',
            alt: 'Deluxe Firecrackers - Red package with explosive design',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            productId: 1,
            url: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Crackers+Front',
            alt: 'Front view of deluxe firecrackers package',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            productId: 1,
            url: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Crackers+Side',
            alt: 'Side view of firecrackers showing safety instructions',
            sortOrder: 2,
            createdAt: new Date('2024-01-15T10:30:00').toISOString(),
        },

        // Product 2 - Sparklers (gold theme)
        {
            productId: 2,
            url: 'https://via.placeholder.com/400x400/ffd93d/000000?text=Golden+Sparklers',
            alt: 'Golden Sparklers - Bright gold sparkler sticks pack',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T11:00:00').toISOString(),
        },
        {
            productId: 2,
            url: 'https://via.placeholder.com/400x400/ffd93d/000000?text=Sparklers+Close',
            alt: 'Close-up view of golden sparkler sticks',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T11:00:00').toISOString(),
        },

        // Product 3 - Flower Pots (green theme)
        {
            productId: 3,
            url: 'https://via.placeholder.com/400x400/6bcf7f/ffffff?text=Flower+Pots',
            alt: 'Flower Pots - Green packaging with blooming flower design',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T11:30:00').toISOString(),
        },
        {
            productId: 3,
            url: 'https://via.placeholder.com/400x400/6bcf7f/ffffff?text=Pots+Display',
            alt: 'Display of colorful flower pot fireworks',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T11:30:00').toISOString(),
        },
        {
            productId: 3,
            url: 'https://via.placeholder.com/400x400/6bcf7f/ffffff?text=Pots+Effect',
            alt: 'Flower pot firework effect demonstration',
            sortOrder: 2,
            createdAt: new Date('2024-01-15T11:30:00').toISOString(),
        },

        // Product 4 - Rockets (blue theme)
        {
            productId: 4,
            url: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Sky+Rockets',
            alt: 'Sky Rockets - Blue packaging with rocket launch graphic',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T12:00:00').toISOString(),
        },
        {
            productId: 4,
            url: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Rockets+Set',
            alt: 'Complete set of aerial rockets with launch tubes',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T12:00:00').toISOString(),
        },

        // Product 5 - Gift Boxes (purple theme)
        {
            productId: 5,
            url: 'https://via.placeholder.com/400x400/a8e6cf/4a4a4a?text=Gift+Boxes',
            alt: 'Gift Boxes - Purple festive gift box collection',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T12:30:00').toISOString(),
        },
        {
            productId: 5,
            url: 'https://via.placeholder.com/400x400/a8e6cf/4a4a4a?text=Gift+Contents',
            alt: 'Assorted fireworks gift box contents display',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T12:30:00').toISOString(),
        },
        {
            productId: 5,
            url: 'https://via.placeholder.com/400x400/a8e6cf/4a4a4a?text=Gift+Unboxed',
            alt: 'Beautifully arranged fireworks gift set',
            sortOrder: 2,
            createdAt: new Date('2024-01-15T12:30:00').toISOString(),
        },

        // Product 6 - Wholesale (orange theme)
        {
            productId: 6,
            url: 'https://via.placeholder.com/400x400/ff8b94/ffffff?text=Wholesale+Bunch',
            alt: 'Wholesale Bunch - Orange bulk packaging for wholesale',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T13:00:00').toISOString(),
        },
        {
            productId: 6,
            url: 'https://via.placeholder.com/400x400/ff8b94/ffffff?text=Bulk+Quantity',
            alt: 'Large quantity fireworks ready for wholesale',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T13:00:00').toISOString(),
        },

        // Product 7 - Firecrackers (red theme)
        {
            productId: 7,
            url: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Lakshmi+Crackers',
            alt: 'Lakshmi Crackers - Premium red firecrackers pack',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T13:30:00').toISOString(),
        },
        {
            productId: 7,
            url: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Lakshmi+Close',
            alt: 'Close view of Lakshmi branded firecrackers',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T13:30:00').toISOString(),
        },

        // Product 8 - Sparklers (gold theme)
        {
            productId: 8,
            url: 'https://via.placeholder.com/400x400/ffd93d/000000?text=Twinkle+Sparklers',
            alt: 'Twinkle Sparklers - Gold sparkle sticks in bulk',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T14:00:00').toISOString(),
        },
        {
            productId: 8,
            url: 'https://via.placeholder.com/400x400/ffd93d/000000?text=Twinkle+Pack',
            alt: 'Pack of assorted twinkle sparklers',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T14:00:00').toISOString(),
        },
        {
            productId: 8,
            url: 'https://via.placeholder.com/400x400/ffd93d/000000?text=Twinkle+Effect',
            alt: 'Twinkle sparklers lighting effect',
            sortOrder: 2,
            createdAt: new Date('2024-01-15T14:00:00').toISOString(),
        },

        // Product 9 - Flower Pots (green theme)
        {
            productId: 9,
            url: 'https://via.placeholder.com/400x400/6bcf7f/ffffff?text=Color+Flower+Pots',
            alt: 'Color Flower Pots - Green color changing flower pots',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T14:30:00').toISOString(),
        },
        {
            productId: 9,
            url: 'https://via.placeholder.com/400x400/6bcf7f/ffffff?text=Color+Pots+Set',
            alt: 'Set of multi-color flower pot fireworks',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T14:30:00').toISOString(),
        },

        // Product 10 - Rockets (blue theme)
        {
            productId: 10,
            url: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Star+Rockets',
            alt: 'Star Rockets - Blue package with star burst effects',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T15:00:00').toISOString(),
        },
        {
            productId: 10,
            url: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Star+Display',
            alt: 'Star rockets display packaging',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T15:00:00').toISOString(),
        },
        {
            productId: 10,
            url: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Star+Burst',
            alt: 'Star burst rocket effect preview',
            sortOrder: 2,
            createdAt: new Date('2024-01-15T15:00:00').toISOString(),
        },

        // Product 11 - Gift Boxes (purple theme)
        {
            productId: 11,
            url: 'https://via.placeholder.com/400x400/a8e6cf/4a4a4a?text=Deluxe+Gift',
            alt: 'Deluxe Gift Box - Purple premium gift box collection',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T15:30:00').toISOString(),
        },
        {
            productId: 11,
            url: 'https://via.placeholder.com/400x400/a8e6cf/4a4a4a?text=Deluxe+Contents',
            alt: 'Deluxe gift box with premium fireworks selection',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T15:30:00').toISOString(),
        },

        // Product 12 - Wholesale (orange theme)
        {
            productId: 12,
            url: 'https://via.placeholder.com/400x400/ff8b94/ffffff?text=Super+Deal',
            alt: 'Super Deal - Orange wholesale combo offer',
            sortOrder: 0,
            createdAt: new Date('2024-01-15T16:00:00').toISOString(),
        },
        {
            productId: 12,
            url: 'https://via.placeholder.com/400x400/ff8b94/ffffff?text=Super+Bulk',
            alt: 'Super bulk quantity fireworks at wholesale prices',
            sortOrder: 1,
            createdAt: new Date('2024-01-15T16:00:00').toISOString(),
        },
    ];

    await db.insert(productImages).values(sampleImages);
    
    console.log('✅ Product images seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});
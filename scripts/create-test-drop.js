#!/usr/bin/env node

const path = require('path');
const knex = require('../server/knex');
const { generateSlug } = require('../server/models/drop.model');

async function createTestDrop() {
    try {
        console.log('🚀 Creating test drop for Laylo design...');

        // Check if test drop already exists
        const existingDrop = await knex('drops').where('slug', 'laylo-test-drop').first();
        if (existingDrop) {
            console.log('✅ Test drop already exists!');
            console.log(`🔗 View at: http://localhost:3000/drop/${existingDrop.slug}`);
            return existingDrop;
        }

        // Create a test user if none exists
        let testUser = await knex('users').first();
        if (!testUser) {
            console.log('👤 Creating test user...');
            const userResult = await knex('users').insert({
                email: 'test@example.com',
                password: 'hashedpassword', // This would be properly hashed in real app
                verified: true,
                created_at: new Date(),
                updated_at: new Date()
            });
            const userId = Array.isArray(userResult) ? userResult[0] : userResult;
            testUser = await knex('users').where('id', userId).first();
            console.log('✅ Test user created');
        }

        // Create test drop with Laylo-style data
        const dropData = {
            title: 'BOUNCE2BOUNCE',
            description: 'Get notified when this exclusive drop goes live!',
            slug: 'laylo-test-drop',
            cover_image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
            background_color: '#DC2626',
            text_color: '#FFFFFF',
            button_color: '#EF4444',
            button_text: 'RSVP',
            is_active: true,
            collect_email: true,
            collect_phone: true,
            user_id: testUser.id,
            // Platform links for testing
            instagram_link: 'https://instagram.com/bounce2bounce',
            twitter_link: 'https://twitter.com/bounce2bounce',
            spotify_link: 'https://open.spotify.com/artist/bounce2bounce',
            youtube_link: 'https://youtube.com/@bounce2bounce',
            created_at: new Date(),
            updated_at: new Date()
        };

        const result = await knex('drops').insert(dropData);
        const dropId = Array.isArray(result) ? result[0] : result;
        const createdDrop = await knex('drops').where('id', dropId).first();

        console.log('✅ Test drop created successfully!');
        console.log(`📋 Drop ID: ${createdDrop.id}`);
        console.log(`🏷️ Title: ${createdDrop.title}`);
        console.log(`🔗 Slug: ${createdDrop.slug}`);
        console.log(`🌐 View at: http://localhost:3000/drop/${createdDrop.slug}`);
        console.log('');
        console.log('🎨 This drop showcases the Laylo-inspired design with:');
        console.log('   • Hero section with cover image');
        console.log('   • "YOUR INVITE" title section');
        console.log('   • Contact form with inlaid RSVP button');
        console.log('   • Platform links');
        console.log('   • Red gradient background');

        return createdDrop;

    } catch (error) {
        console.error('❌ Error creating test drop:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createTestDrop()
        .then(() => {
            console.log('🎉 Test drop creation complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Failed to create test drop:', error);
            process.exit(1);
        });
}

module.exports = { createTestDrop };
// Debug script to test template rendering with actual drop data
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig);
const handlebars = require('handlebars');
const fs = require('fs');

async function debugTemplateRendering() {
    try {
        console.log('🎨 DEBUGGING TEMPLATE RENDERING');
        console.log('='.repeat(50));
        
        // Get a drop with overscroll color set
        console.log('\n1️⃣ Getting drop data...');
        const drop = await knex('drops')
            .where('overscroll_background_color', '!=', '#ffffff')
            .first();
        
        if (!drop) {
            console.log('❌ No drops found with custom overscroll color');
            return;
        }
        
        console.log('Found drop:', {
            id: drop.id,
            title: drop.title,
            background_color: drop.background_color,
            overscroll_background_color: drop.overscroll_background_color
        });
        
        // Test the Handlebars template logic
        console.log('\n2️⃣ Testing Handlebars template logic...');
        
        // Register the eq helper (used in the template)
        handlebars.registerHelper('eq', function(a, b) {
            return a === b;
        });
        
        // Test the overscroll color template
        const overscrollTemplate = `{{#if drop.overscroll_background_color}}{{drop.overscroll_background_color}}{{else}}#ffffff{{/if}}`;
        const compiledTemplate = handlebars.compile(overscrollTemplate);
        const renderedColor = compiledTemplate({ drop });
        
        console.log('Template input:', overscrollTemplate);
        console.log('Rendered color:', renderedColor);
        console.log('Expected color:', drop.overscroll_background_color);
        console.log('Match:', renderedColor === drop.overscroll_background_color ? '✅' : '❌');
        
        // Test the CSS variable template
        console.log('\n3️⃣ Testing CSS variable template...');
        const cssVarTemplate = `--drop-overscroll-background-color: {{#if drop.overscroll_background_color}}{{drop.overscroll_background_color}}{{else}}#ffffff{{/if}};`;
        const compiledCssVar = handlebars.compile(cssVarTemplate);
        const renderedCssVar = compiledCssVar({ drop });
        
        console.log('CSS variable template:', cssVarTemplate);
        console.log('Rendered CSS variable:', renderedCssVar);
        
        // Test the body background template
        console.log('\n4️⃣ Testing body background template...');
        const bodyBgTemplate = `background: {{#if drop.overscroll_background_color}}{{drop.overscroll_background_color}}{{else}}#ffffff{{/if}} !important;`;
        const compiledBodyBg = handlebars.compile(bodyBgTemplate);
        const renderedBodyBg = compiledBodyBg({ drop });
        
        console.log('Body background template:', bodyBgTemplate);
        console.log('Rendered body background:', renderedBodyBg);
        
        // Test with a drop that has null/undefined overscroll color
        console.log('\n5️⃣ Testing fallback logic...');
        const dropWithoutOverscroll = { ...drop, overscroll_background_color: null };
        const fallbackColor = compiledTemplate({ drop: dropWithoutOverscroll });
        console.log('Fallback color (null input):', fallbackColor);
        console.log('Should be #ffffff:', fallbackColor === '#ffffff' ? '✅' : '❌');
        
        // Test with undefined
        const dropUndefined = { ...drop };
        delete dropUndefined.overscroll_background_color;
        const undefinedColor = compiledTemplate({ drop: dropUndefined });
        console.log('Fallback color (undefined input):', undefinedColor);
        console.log('Should be #ffffff:', undefinedColor === '#ffffff' ? '✅' : '❌');
        
    } catch (error) {
        console.error('❌ Template rendering debug error:', error.message);
        console.error(error.stack);
    } finally {
        await knex.destroy();
        console.log('\n🏁 Template rendering debug completed.');
    }
}

debugTemplateRendering();

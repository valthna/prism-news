// Test de diagnostic pour fetchNewsArticles
import { fetchNewsArticles } from './services/geminiService';

console.log('🧪 DIAGNOSTIC TEST STARTED');

async function testFetch() {
    console.log('📞 Calling fetchNewsArticles()...');

    try {
        const start = Date.now();
        const articles = await fetchNewsArticles();
        const duration = Date.now() - start;

        console.log(`✅ SUCCESS in ${duration}ms`);
        console.log(`📊 Received ${articles.length} articles`);

        if (articles.length > 0) {
            console.log('📰 First article:', {
                headline: articles[0].headline,
                hasImage: !!articles[0].imageUrl
            });
        }
    } catch (error) {
        console.error('❌ FAILED:', error);
        console.error('Stack:', error.stack);
    }
}

// Auto-run
testFetch();

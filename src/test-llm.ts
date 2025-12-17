#!/usr/bin/env node
/**
 * Test script to verify LLM integration
 * 
 * Usage:
 *   npx tsx src/test-llm.ts
 */

// Load environment variables first
import './utils/env.js';

import { createLLMClient } from './utils/llm.js';

async function testLLMConnection(): Promise<void> {
  console.log('\n🧪 Testing LLM Connection\n');
  console.log('='.repeat(50));

  // Check for API keys
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  console.log(`\n📋 Environment Check:`);
  console.log(`   ANTHROPIC_API_KEY: ${anthropicKey ? '✅ Set (' + anthropicKey.slice(0, 15) + '...)' : '❌ Not set'}`);
  console.log(`   OPENAI_API_KEY: ${openaiKey ? '✅ Set (' + openaiKey.slice(0, 15) + '...)' : '❌ Not set'}`);

  if (!anthropicKey && !openaiKey) {
    console.log('\n⚠️  No API keys found. Running in simulation mode.');
    console.log('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env to test real generation.\n');
  }

  // Create client
  const client = createLLMClient(true);
  console.log(`\n🔌 Created LLM client`);

  // Simple test
  console.log(`\n📝 Sending test prompt...\n`);
  
  try {
    const response = await client.complete([
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond concisely.',
      },
      {
        role: 'user',
        content: 'Say "LLM connection successful!" and nothing else.',
      },
    ]);

    console.log(`\n✅ Response received:`);
    console.log(`   "${response.content}"`);
    
    if (response.usage) {
      console.log(`\n📊 Token Usage:`);
      console.log(`   Input: ${response.usage.inputTokens}`);
      console.log(`   Output: ${response.usage.outputTokens}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ LLM integration test passed!\n');

  } catch (error) {
    console.error(`\n❌ LLM test failed:`, error);
    process.exit(1);
  }
}

testLLMConnection();

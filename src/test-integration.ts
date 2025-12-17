#!/usr/bin/env node
/**
 * Full Integration Test for Agentic Testing Workflow
 * 
 * This script tests the complete workflow with a real LLM:
 * 1. Load a story
 * 2. Generate a test plan (Planner Agent)
 * 3. Generate Gherkin scenarios (Case Worker Agent)
 * 4. Generate Cypress code (Code Worker Agent)
 * 
 * Usage:
 *   npx tsx src/test-integration.ts [story-id]
 *   
 * Examples:
 *   npx tsx src/test-integration.ts story-001-delete-user
 *   npx tsx src/test-integration.ts story-002-user-registration
 */

// Load environment variables first
import './utils/env.js';

import { PlannerAgent, CaseWorkerAgent, CodeWorkerAgent } from './agents/index.js';
import { loadSystemContext } from './utils/context.js';
import { readFile, writeFile, fileExists, listFiles } from './utils/files.js';
import { createLLMClient } from './utils/llm.js';

async function runIntegrationTest(storyId: string): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 AGENTIC TESTING WORKFLOW - INTEGRATION TEST');
  console.log('═'.repeat(70));

  const startTime = Date.now();

  // Check API key
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  console.log(`\n📋 Configuration:`);
  console.log(`   Story ID: ${storyId}`);
  console.log(`   API Key: ${hasApiKey ? '✅ Present' : '⚠️  Missing (simulation mode)'}`);
  console.log(`   Model: ${process.env.ANTHROPIC_MODEL || process.env.OPENAI_MODEL || 'default'}`);

  // Load story
  const storyPath = `specs/${storyId}.md`;
  if (!await fileExists(storyPath)) {
    console.error(`\n❌ Story not found: ${storyPath}`);
    console.log('\nAvailable stories:');
    const files = await listFiles('specs', '.md');
    files.forEach(f => console.log(`   - ${f.replace('.md', '')}`));
    process.exit(1);
  }

  const story = await readFile(storyPath);
  console.log(`\n📖 Loaded story: ${storyPath} (${story.length} chars)`);

  // Load context
  const context = await loadSystemContext();
  console.log(`📚 Loaded system context`);

  // Create shared LLM client
  const llm = createLLMClient(true);

  // Track total tokens
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // ============================================================================
  // PHASE 1: PLANNING
  // ============================================================================

  console.log('\n' + '─'.repeat(70));
  console.log('📝 PHASE 1: Test Planning');
  console.log('─'.repeat(70));

  const planner = new PlannerAgent(llm, true);
  const planResult = await planner.execute({
    context,
    payload: {
      story,
      storyId,
    },
  });

  if (!planResult.success) {
    console.error(`\n❌ Planning failed: ${planResult.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Test plan generated (${planResult.result?.length} chars)`);
  
  if (planResult.metadata?.tokens) {
    totalInputTokens += planResult.metadata.tokens.inputTokens;
    totalOutputTokens += planResult.metadata.tokens.outputTokens;
  }

  // Save plan
  const planPath = `test-artifacts/${storyId}/test-plan.md`;
  await writeFile(planPath, planResult.result!);

  // Show preview
  console.log('\n📄 Plan Preview (first 30 lines):');
  console.log('─'.repeat(50));
  const planLines = planResult.result!.split('\n').slice(0, 30);
  console.log(planLines.join('\n'));
  if (planResult.result!.split('\n').length > 30) {
    console.log('... (truncated)');
  }

  // ============================================================================
  // PHASE 2: GHERKIN SCENARIOS
  // ============================================================================

  console.log('\n' + '─'.repeat(70));
  console.log('🥒 PHASE 2: Gherkin Scenario Generation');
  console.log('─'.repeat(70));

  const caseWorker = new CaseWorkerAgent(llm, true);
  const casesResult = await caseWorker.execute({
    context,
    payload: {
      testPlan: planResult.result!,
      storyId,
      story,
    },
  });

  if (!casesResult.success) {
    console.error(`\n❌ Case generation failed: ${casesResult.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Gherkin scenarios generated (${casesResult.result?.length} chars)`);

  if (casesResult.metadata?.tokens) {
    totalInputTokens += casesResult.metadata.tokens.inputTokens;
    totalOutputTokens += casesResult.metadata.tokens.outputTokens;
  }

  // Save scenarios
  const scenariosPath = `test-artifacts/${storyId}/scenarios.feature`;
  await writeFile(scenariosPath, casesResult.result!);

  // Show preview
  console.log('\n📄 Scenarios Preview (first 40 lines):');
  console.log('─'.repeat(50));
  const scenarioLines = casesResult.result!.split('\n').slice(0, 40);
  console.log(scenarioLines.join('\n'));
  if (casesResult.result!.split('\n').length > 40) {
    console.log('... (truncated)');
  }

  // ============================================================================
  // PHASE 3: CYPRESS CODE
  // ============================================================================

  console.log('\n' + '─'.repeat(70));
  console.log('💻 PHASE 3: Cypress Code Generation');
  console.log('─'.repeat(70));

  // Try to load existing helpers
  let helpers = '';
  try {
    helpers = await readFile('cypress/support/commands.ts');
    console.log('📦 Loaded Cypress helpers');
  } catch {
    console.log('ℹ️  No Cypress helpers found, continuing without');
  }

  const codeWorker = new CodeWorkerAgent(llm, true);
  const codeResult = await codeWorker.execute({
    context,
    payload: {
      gherkinScenarios: casesResult.result!,
      storyId,
      exampleTests: '',
      helpers,
    },
  });

  if (!codeResult.success) {
    console.error(`\n❌ Code generation failed: ${codeResult.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Cypress code generated (${codeResult.result?.length} chars)`);

  if (codeResult.metadata?.tokens) {
    totalInputTokens += codeResult.metadata.tokens.inputTokens;
    totalOutputTokens += codeResult.metadata.tokens.outputTokens;
  }

  // Save code
  const codePath = `cypress/e2e/${storyId}.cy.ts`;
  await writeFile(codePath, codeResult.result!);

  // Show preview
  console.log('\n📄 Code Preview (first 50 lines):');
  console.log('─'.repeat(50));
  const codeLines = codeResult.result!.split('\n').slice(0, 50);
  console.log(codeLines.join('\n'));
  if (codeResult.result!.split('\n').length > 50) {
    console.log('... (truncated)');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  const totalDuration = Date.now() - startTime;

  console.log('\n' + '═'.repeat(70));
  console.log('📊 INTEGRATION TEST COMPLETE');
  console.log('═'.repeat(70));

  console.log('\n📁 Generated Artifacts:');
  console.log(`   📝 Test Plan:     ${planPath}`);
  console.log(`   🥒 Scenarios:     ${scenariosPath}`);
  console.log(`   💻 Cypress Code:  ${codePath}`);

  console.log('\n📈 Statistics:');
  console.log(`   Total Duration:  ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`   Input Tokens:    ${totalInputTokens.toLocaleString()}`);
  console.log(`   Output Tokens:   ${totalOutputTokens.toLocaleString()}`);
  console.log(`   Total Tokens:    ${(totalInputTokens + totalOutputTokens).toLocaleString()}`);

  // Estimate cost based on which provider we used
  if (process.env.ANTHROPIC_API_KEY) {
    // Claude Sonnet pricing
    const inputCost = (totalInputTokens / 1_000_000) * 3;
    const outputCost = (totalOutputTokens / 1_000_000) * 15;
    console.log(`\n💰 Estimated Cost (Claude Sonnet):`);
    console.log(`   Input:  $${inputCost.toFixed(4)}`);
    console.log(`   Output: $${outputCost.toFixed(4)}`);
    console.log(`   Total:  $${(inputCost + outputCost).toFixed(4)}`);
  } else if (process.env.OPENAI_API_KEY) {
    // GPT-4 Turbo pricing
    const inputCost = (totalInputTokens / 1_000_000) * 10;
    const outputCost = (totalOutputTokens / 1_000_000) * 30;
    console.log(`\n💰 Estimated Cost (GPT-4 Turbo):`);
    console.log(`   Input:  $${inputCost.toFixed(4)}`);
    console.log(`   Output: $${outputCost.toFixed(4)}`);
    console.log(`   Total:  $${(inputCost + outputCost).toFixed(4)}`);
  }

  console.log('\n✅ All phases completed successfully!\n');
}

// Main
const storyId = process.argv[2] || 'story-001-delete-user';
runIntegrationTest(storyId).catch(console.error);

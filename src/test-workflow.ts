#!/usr/bin/env node
/**
 * Quick workflow test - runs in simulation mode
 * 
 * Usage:
 *   npx tsx src/test-workflow.ts [story-id]
 */

import { WorkflowOrchestrator } from './orchestrator/index.js';
import { listFiles } from './utils/files.js';

async function testWorkflow(storyId: string): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 WORKFLOW TEST (Simulation Mode)');
  console.log('═'.repeat(60));
  console.log(`\n📖 Story: ${storyId}`);
  console.log('📝 This test verifies the workflow runs without errors.\n');

  const orchestrator = new WorkflowOrchestrator(
    { humanApprovalRequired: false },
    true // verbose
  );

  try {
    const state = await orchestrator.runWorkflow(storyId);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 WORKFLOW RESULTS');
    console.log('═'.repeat(60));
    console.log(`\nStatus: ${state.phase}`);
    
    if (state.phase === 'completed') {
      console.log('\n✅ Workflow completed successfully!\n');
      console.log('Generated files:');
      console.log(`  📝 test-artifacts/${storyId}/test-plan.md`);
      console.log(`  🥒 test-artifacts/${storyId}/scenarios.feature`);
      console.log(`  💻 cypress/e2e/${storyId}.cy.ts`);
    } else if (state.phase === 'failed') {
      console.log(`\n❌ Workflow failed: ${state.metadata.error}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Main
const storyId = process.argv[2] || 'story-001-delete-user';
testWorkflow(storyId);

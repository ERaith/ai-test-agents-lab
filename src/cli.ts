#!/usr/bin/env node
/**
 * CLI Entry Point for Agentic Testing Workflow
 * 
 * LEARNING NOTE: A good CLI is essential for adoption. It should be:
 * - Easy to use for common tasks
 * - Flexible for advanced users
 * - Well-documented with examples
 * 
 * Usage:
 *   npx tsx src/cli.ts plan story-001
 *   npx tsx src/cli.ts cases story-001
 *   npx tsx src/cli.ts code story-001
 *   npx tsx src/cli.ts full story-001
 *   npx tsx src/cli.ts list
 *   npx tsx src/cli.ts demo
 */

// Load environment variables first
import './utils/env.js';

import { WorkflowOrchestrator } from './orchestrator/index.js';
import { listFiles, readFile, fileExists } from './utils/files.js';
import * as readline from 'readline';
import * as path from 'path';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIArgs {
  command: 'plan' | 'cases' | 'code' | 'full' | 'list' | 'demo' | 'help';
  storyId: string;
  flags: {
    verbose: boolean;
    skipApproval: boolean;
    help: boolean;
    withFeedback: boolean;
    callerRepo?: string;
  };
}

function parseArgs(args: string[]): CLIArgs {
  const flags: CLIArgs['flags'] = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipApproval: args.includes('--skip-approval') || args.includes('-y'),
    help: args.includes('--help') || args.includes('-h'),
    withFeedback: args.includes('--with-feedback') || args.includes('-f'),
  };

  // Extract --caller-repo value
  const callerRepoIndex = args.findIndex(a => a === '--caller-repo');
  if (callerRepoIndex !== -1 && args[callerRepoIndex + 1]) {
    flags.callerRepo = args[callerRepoIndex + 1];
  }

  // Filter out flags and their values
  const positional = args.filter((a, i) => {
    if (a.startsWith('-')) return false;
    if (i > 0 && args[i - 1] === '--caller-repo') return false;
    return true;
  });

  const command = (positional[0] || 'help') as CLIArgs['command'];
  const storyId = positional[1] || '';

  return { command, storyId, flags };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
🤖 Agentic Testing Workflow CLI

USAGE:
  npx tsx src/cli.ts <command> [story-id] [options]

COMMANDS:
  plan <story-id>     Generate a test plan from a story
  cases <story-id>    Generate Gherkin scenarios from an existing plan
  code <story-id>     Generate test code from existing scenarios
  full <story-id>     Run the complete workflow (plan → cases → code)
  list                List all available stories
  demo                Interactive demo - select a story and run workflow
  help                Show this help message

OPTIONS:
  -v, --verbose           Show detailed output
  -y, --skip-approval     Skip human approval prompts (for CI/testing)
  -f, --with-feedback     Include feedback/patch file in generation
  --caller-repo <path>    Path to caller repo (for PR patch files)
  -h, --help              Show this help message

EXAMPLES:
  # List available stories
  npx tsx src/cli.ts list

  # Interactive demo (select story from menu)
  npx tsx src/cli.ts demo

  # Generate only a test plan
  npx tsx src/cli.ts plan story-001

  # Run full workflow with approval prompts
  npx tsx src/cli.ts full story-002-user-registration

  # Run full workflow without prompts (CI mode)
  npx tsx src/cli.ts full story-003-shopping-cart --skip-approval

  # Re-run with feedback (create test-artifacts/story-001/feedback.md first)
  npx tsx src/cli.ts plan story-001 --with-feedback

ENVIRONMENT:
  ANTHROPIC_API_KEY   API key for Claude (recommended)
  OPENAI_API_KEY      API key for OpenAI (alternative)

  If no API key is set, simulation mode is used.

FILES:
  specs/              Story files (story-001.md, etc.)
  test-artifacts/     Generated plans and scenarios
  cypress/e2e/        Generated test code
`);
}

// ============================================================================
// Story Management
// ============================================================================

interface StoryInfo {
  id: string;
  filename: string;
  title: string;
  priority: string;
  points: string;
}

async function listStories(): Promise<StoryInfo[]> {
  const specsDir = 'specs';
  const files = await listFiles(specsDir);
  const stories: StoryInfo[] = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await readFile(path.join(specsDir, file));
      const id = file.replace('.md', '');
      
      // Extract metadata from content
      const titleMatch = content.match(/^# (.+)$/m);
      const priorityMatch = content.match(/^## Priority\n(.+)$/m);
      const pointsMatch = content.match(/^## Story Points\n(\d+)$/m);

      stories.push({
        id,
        filename: file,
        title: titleMatch ? titleMatch[1] : id,
        priority: priorityMatch ? priorityMatch[1].trim() : 'Unknown',
        points: pointsMatch ? pointsMatch[1] : '?',
      });
    }
  }

  return stories.sort((a, b) => a.id.localeCompare(b.id));
}

async function showStoryList(): Promise<void> {
  const stories = await listStories();

  console.log('\n📚 Available Stories\n');
  console.log('─'.repeat(80));
  console.log(
    '  #  │ ID                          │ Priority │ Points │ Title'
  );
  console.log('─'.repeat(80));

  stories.forEach((story, index) => {
    const num = String(index + 1).padStart(3);
    const id = story.id.padEnd(27);
    const priority = story.priority.padEnd(8);
    const points = story.points.padStart(6);
    const title = story.title.substring(0, 30);
    console.log(`${num}  │ ${id} │ ${priority} │ ${points} │ ${title}`);
  });

  console.log('─'.repeat(80));
  console.log(`\nTotal: ${stories.length} stories\n`);
}

// ============================================================================
// Interactive Demo
// ============================================================================

async function runInteractiveDemo(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  console.log('\n🤖 Agentic Testing Workflow - Interactive Demo\n');
  console.log('This demo will walk you through the workflow for a story of your choice.\n');

  // Check for API key
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasApiKey) {
    console.log('⚠️  No API key detected - running in SIMULATION mode');
    console.log('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY for real generation\n');
  }

  // List stories
  const stories = await listStories();
  
  console.log('Available stories:\n');
  stories.forEach((story, index) => {
    console.log(`  ${index + 1}. ${story.id}`);
    console.log(`     ${story.title} (${story.priority}, ${story.points} pts)\n`);
  });

  // Select story
  const selection = await question('Select a story number (or enter story ID): ');
  
  let selectedStory: StoryInfo | undefined;
  
  const num = parseInt(selection, 10);
  if (!isNaN(num) && num >= 1 && num <= stories.length) {
    selectedStory = stories[num - 1];
  } else {
    selectedStory = stories.find(s => s.id === selection || s.id.includes(selection));
  }

  if (!selectedStory) {
    console.log('\n❌ Story not found. Please try again.\n');
    rl.close();
    return;
  }

  console.log(`\n✅ Selected: ${selectedStory.title}\n`);

  // Select workflow type
  console.log('Workflow options:');
  console.log('  1. Full workflow (plan → cases → code)');
  console.log('  2. Planning only');
  console.log('  3. Cases only (requires existing plan)');
  console.log('  4. Code only (requires existing cases)\n');

  const workflowChoice = await question('Select workflow (1-4): ');

  // Approval mode
  const approvalChoice = await question('\nRequire approval at each step? (y/n): ');
  const skipApproval = approvalChoice.toLowerCase() !== 'y';

  rl.close();

  // Run the workflow
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting workflow...');
  console.log('='.repeat(60) + '\n');

  const orchestrator = new WorkflowOrchestrator(
    { humanApprovalRequired: !skipApproval },
    true // verbose
  );

  if (!skipApproval) {
    orchestrator.setApprovalCallback(async (request) => {
      return promptForApproval(request.phase, request.artifact);
    });
  }

  try {
    let state;

    switch (workflowChoice) {
      case '2':
        state = await orchestrator.runPlanningOnly(selectedStory.id);
        break;
      case '3':
        state = await orchestrator.runCasesOnly(selectedStory.id);
        break;
      case '4':
        state = await orchestrator.runCodeOnly(selectedStory.id);
        break;
      default:
        state = await orchestrator.runWorkflow(selectedStory.id);
    }

    printSummary(state);
  } catch (error) {
    console.error('\n❌ Workflow failed:', error);
  }
}

// ============================================================================
// Interactive Approval Prompt
// ============================================================================

async function promptForApproval(phase: string, artifact: string): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 Review Required: ${phase}`);
  console.log('='.repeat(60));
  console.log('\nGenerated artifact (first 50 lines):');
  console.log('-'.repeat(40));
  
  const lines = artifact.split('\n').slice(0, 50);
  console.log(lines.join('\n'));
  
  if (artifact.split('\n').length > 50) {
    console.log('\n... (truncated, see full file in test-artifacts/)');
  }
  
  console.log('-'.repeat(40));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n✅ Approve and continue? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ============================================================================
// Summary Output
// ============================================================================

function printSummary(state: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Workflow Summary');
  console.log('='.repeat(60));
  console.log(`Story:    ${state.storyId}`);
  console.log(`Status:   ${state.phase}`);
  console.log(`Duration: ${(state.metadata.completedAt?.getTime() || Date.now()) - state.metadata.startedAt.getTime()}ms`);
  
  if (state.artifacts.testPlan) {
    console.log(`Plan:     test-artifacts/${state.storyId}/test-plan.md`);
  }
  if (state.artifacts.gherkinScenarios) {
    console.log(`Cases:    test-artifacts/${state.storyId}/scenarios.feature`);
  }
  if (state.artifacts.testCode) {
    console.log(`Code:     cypress/e2e/${state.storyId}.cy.ts`);
  }

  if (state.phase === 'failed') {
    console.log(`Error:    ${state.metadata.error}`);
  }

  console.log('\n');
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.help || args.command === 'help') {
    showHelp();
    process.exit(0);
  }

  // Handle list command
  if (args.command === 'list') {
    await showStoryList();
    process.exit(0);
  }

  // Handle demo command
  if (args.command === 'demo') {
    await runInteractiveDemo();
    process.exit(0);
  }

  // Validate story ID for other commands
  if (!args.storyId) {
    console.error('❌ Error: story-id is required');
    console.log('\nAvailable stories:');
    const stories = await listStories();
    stories.forEach(s => console.log(`  - ${s.id}`));
    console.log('\nRun with --help for usage information');
    process.exit(1);
  }

  // Check if story exists
  const storyPath = `specs/${args.storyId}.md`;
  if (!await fileExists(storyPath)) {
    console.error(`❌ Error: Story not found: ${storyPath}`);
    console.log('\nAvailable stories:');
    const stories = await listStories();
    stories.forEach(s => console.log(`  - ${s.id}`));
    process.exit(1);
  }

  // Create orchestrator
  const orchestrator = new WorkflowOrchestrator(
    { humanApprovalRequired: !args.flags.skipApproval },
    args.flags.verbose,
    args.flags.withFeedback,
    args.flags.callerRepo
  );

  if (args.flags.withFeedback) {
    if (args.flags.callerRepo) {
      console.log(`📝 Feedback mode enabled - checking ${args.flags.callerRepo}/.test-patches/\n`);
    } else {
      console.log('📝 Feedback mode enabled - checking test-artifacts/ for feedback.md\n');
    }
  }

  // Set up approval callback if not skipping
  if (!args.flags.skipApproval) {
    orchestrator.setApprovalCallback(async (request) => {
      return promptForApproval(request.phase, request.artifact);
    });
  }

  console.log(`\n🚀 Running command: ${args.command} for ${args.storyId}\n`);

  try {
    let state;

    switch (args.command) {
      case 'plan':
        state = await orchestrator.runPlanningOnly(args.storyId);
        break;

      case 'cases':
        state = await orchestrator.runCasesOnly(args.storyId);
        break;

      case 'code':
        state = await orchestrator.runCodeOnly(args.storyId);
        break;

      case 'full':
        state = await orchestrator.runWorkflow(args.storyId);
        break;

      default:
        console.error(`❌ Unknown command: ${args.command}`);
        showHelp();
        process.exit(1);
    }

    printSummary(state);

    if (state.phase === 'failed') {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

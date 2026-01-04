/**
 * Prompts Module
 *
 * Centralized exports for all prompt modules.
 * Each module provides versioned, testable prompts for agents.
 */

// Base utilities
export {
  PromptMetadata,
  BuiltPrompt,
  SHARED_RULES,
  getSharedRules,
  formatContext,
  generatePromptArtifact,
  addVersionHeader,
} from './base.js';

// Planner prompts
export {
  PLANNER_PROMPT_METADATA,
  buildPlannerPrompt,
  processPlannerResponse,
} from './planner.js';

// Case Worker prompts
export {
  CASES_PROMPT_METADATA,
  buildCasesPrompt,
  processCasesResponse,
} from './cases.js';

// Code Worker prompts
export {
  CODE_PROMPT_METADATA,
  buildCodePrompt,
  processCodeResponse,
} from './code.js';

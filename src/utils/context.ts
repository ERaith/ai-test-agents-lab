/**
 * Context Loader
 * 
 * LEARNING NOTE: Loading and parsing system context is a critical function.
 * The quality of agent outputs depends heavily on the context they receive.
 * 
 * INTERVIEW POINT: "Context management is often overlooked but crucial.
 * We parse markdown files into structured data that agents can reliably use.
 * This ensures consistency across all agent interactions."
 */

import { SystemContext, DomainConstraint } from '../types.js';
import { readFile, fileExists } from './files.js';

const DEFAULT_CONTEXT_PATH = 'src/prompts/system-context.md';

/**
 * Load and parse the system context file
 */
export async function loadSystemContext(customPath?: string): Promise<SystemContext> {
  const contextPath = customPath || DEFAULT_CONTEXT_PATH;
  
  if (!await fileExists(contextPath)) {
    console.warn(`⚠️  System context not found at ${contextPath}, using defaults`);
    return getDefaultContext();
  }

  const content = await readFile(contextPath);
  return parseSystemContext(content);
}

/**
 * Parse markdown system context into structured data
 * 
 * LEARNING NOTE: This parser extracts structured information from markdown.
 * In production, you might use a more sophisticated parser or store
 * context in JSON/YAML for easier parsing.
 */
function parseSystemContext(markdown: string): SystemContext {
  const context = getDefaultContext();

  // Extract tech stack
  const techStackMatch = markdown.match(/## Tech Stack\n([\s\S]*?)(?=\n##|$)/);
  if (techStackMatch) {
    const techSection = techStackMatch[1];
    const backendMatch = techSection.match(/Backend:\s*(.+)/);
    const frontendMatch = techSection.match(/Frontend:\s*(.+)/);
    const e2eMatch = techSection.match(/E2E tests:\s*(.+)/);
    
    if (backendMatch) context.techStack.backend = backendMatch[1].trim();
    if (frontendMatch) context.techStack.frontend = frontendMatch[1].trim();
    if (e2eMatch) context.techStack.testFramework = e2eMatch[1].trim();
  }

  // Extract testing principles
  const principlesMatch = markdown.match(/## Testing Principles\n([\s\S]*?)(?=\n##|$)/);
  if (principlesMatch) {
    const principles = principlesMatch[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
    context.testingPrinciples = principles;
  }

  // Extract domain constraints
  const constraintsMatch = markdown.match(/## Domain Constraints[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
  if (constraintsMatch) {
    const constraints = parseConstraints(constraintsMatch[1]);
    context.domainConstraints = constraints;
  }

  // Extract output expectations
  const outputMatch = markdown.match(/## Output Expectations\n([\s\S]*?)(?=\n##|$)/);
  if (outputMatch) {
    const outputSection = outputMatch[1];
    const planningMatch = outputSection.match(/planning.*?output\s*\*\*(.+?)\*\*/i);
    const casesMatch = outputSection.match(/test cases.*?output\s*\*\*(.+?)\*\*/i);
    const codeMatch = outputSection.match(/code.*?output\s*\*\*(.+?)\*\*/i);
    
    if (planningMatch) context.outputExpectations.planning = planningMatch[1];
    if (casesMatch) context.outputExpectations.testCases = casesMatch[1];
    if (codeMatch) context.outputExpectations.code = codeMatch[1];
  }

  return context;
}

/**
 * Parse domain constraints from markdown
 */
function parseConstraints(text: string): DomainConstraint[] {
  const constraints: DomainConstraint[] = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  let currentEntity = '';
  let currentRules: string[] = [];

  for (const line of lines) {
    if (line.startsWith('-') && !line.startsWith('  -')) {
      // New entity
      if (currentEntity && currentRules.length > 0) {
        constraints.push({ entity: currentEntity, rules: currentRules });
      }
      currentEntity = line.replace(/^-\s*/, '').replace(/:$/, '').trim();
      currentRules = [];
    } else if (line.trim().startsWith('-')) {
      // Rule for current entity
      currentRules.push(line.replace(/^\s*-\s*/, '').trim());
    }
  }

  // Don't forget the last entity
  if (currentEntity && currentRules.length > 0) {
    constraints.push({ entity: currentEntity, rules: currentRules });
  }

  // If no structured constraints found, treat each line as a rule
  if (constraints.length === 0) {
    const rules = lines.filter(l => l.startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
    if (rules.length > 0) {
      constraints.push({ entity: 'General', rules });
    }
  }

  return constraints;
}

/**
 * Default context when no file is found
 */
function getDefaultContext(): SystemContext {
  return {
    techStack: {
      backend: 'Node.js/Express',
      frontend: 'React',
      testFramework: 'Cypress',
      language: 'TypeScript',
    },
    testingPrinciples: [
      'Focus on high-value, maintainable tests',
      'Prefer a few strong tests over many brittle ones',
      'Use BDD/Gherkin style for planning',
      'Use descriptive tags (@smoke, @regression)',
    ],
    domainConstraints: [],
    outputExpectations: {
      planning: 'markdown',
      testCases: 'Gherkin',
      code: 'TypeScript',
    },
    paths: {
      specs: 'specs',
      artifacts: 'test-artifacts',
      tests: 'cypress/e2e',
      helpers: 'cypress/support/commands.ts',
    },
  };
}

/**
 * Format context as a string for prompts
 */
export function formatContextForPrompt(context: SystemContext): string {
  return `
## Tech Stack
- Backend: ${context.techStack.backend}
- Frontend: ${context.techStack.frontend}
- Test Framework: ${context.techStack.testFramework}
- Language: ${context.techStack.language}

## Testing Principles
${context.testingPrinciples.map(p => `- ${p}`).join('\n')}

## Domain Constraints
${context.domainConstraints.map(c => `
### ${c.entity}
${c.rules.map(r => `- ${r}`).join('\n')}
`).join('\n')}

## Output Expectations
- Planning: ${context.outputExpectations.planning}
- Test Cases: ${context.outputExpectations.testCases}
- Code: ${context.outputExpectations.code}
`.trim();
}

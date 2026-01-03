/**
 * PR Diff Analyzer
 *
 * Analyzes PR diffs to determine test structure by:
 * 1. Parsing changed files from the diff
 * 2. Finding related/dependent files
 * 3. Extracting context for test generation
 */

import { StorageProvider } from '../storage/types.js';

/**
 * A file changed in the PR
 */
export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;  // The actual diff content
}

/**
 * Related file discovered through dependency analysis
 */
export interface RelatedFile {
  path: string;
  relationship: 'imports' | 'imported-by' | 'tests' | 'tested-by' | 'same-module';
  relevance: number;  // 0-1 score
}

/**
 * Analysis result for test generation
 */
export interface DiffAnalysis {
  changedFiles: ChangedFile[];
  relatedFiles: RelatedFile[];
  testableChanges: TestableChange[];
  suggestedTestTypes: string[];
  riskAreas: RiskArea[];
  context: AnalysisContext;
}

/**
 * A specific change that needs testing
 */
export interface TestableChange {
  file: string;
  type: 'new-feature' | 'bug-fix' | 'refactor' | 'api-change' | 'ui-change';
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedTests: string[];
}

/**
 * An area of risk identified in the changes
 */
export interface RiskArea {
  area: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Context gathered for test generation
 */
export interface AnalysisContext {
  changedModules: string[];
  affectedEndpoints: string[];
  affectedComponents: string[];
  dependencies: string[];
  previousTestPatterns: string[];
}

/**
 * PR Diff Analyzer
 */
export class DiffAnalyzer {
  constructor(
    private storage?: StorageProvider,
    private baseRef: string = 'main'
  ) {}

  /**
   * Analyze a PR diff for test generation
   */
  async analyzeDiff(diffContent: string): Promise<DiffAnalysis> {
    const changedFiles = this.parseGitDiff(diffContent);
    const relatedFiles = await this.findRelatedFiles(changedFiles);
    const testableChanges = this.identifyTestableChanges(changedFiles);
    const suggestedTestTypes = this.suggestTestTypes(changedFiles, testableChanges);
    const riskAreas = this.identifyRiskAreas(changedFiles, testableChanges);
    const context = await this.gatherContext(changedFiles, relatedFiles);

    return {
      changedFiles,
      relatedFiles,
      testableChanges,
      suggestedTestTypes,
      riskAreas,
      context,
    };
  }

  /**
   * Analyze from GitHub PR API response
   */
  async analyzeFromGitHub(prFiles: GitHubPRFile[]): Promise<DiffAnalysis> {
    const changedFiles: ChangedFile[] = prFiles.map(f => ({
      path: f.filename,
      status: this.mapGitHubStatus(f.status),
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));

    const relatedFiles = await this.findRelatedFiles(changedFiles);
    const testableChanges = this.identifyTestableChanges(changedFiles);
    const suggestedTestTypes = this.suggestTestTypes(changedFiles, testableChanges);
    const riskAreas = this.identifyRiskAreas(changedFiles, testableChanges);
    const context = await this.gatherContext(changedFiles, relatedFiles);

    return {
      changedFiles,
      relatedFiles,
      testableChanges,
      suggestedTestTypes,
      riskAreas,
      context,
    };
  }

  /**
   * Parse git diff output into structured changes
   */
  private parseGitDiff(diff: string): ChangedFile[] {
    const files: ChangedFile[] = [];
    const filePattern = /^diff --git a\/(.+) b\/(.+)$/gm;
    const statusPattern = /^(new file|deleted file|rename from|rename to)/gm;

    let match;
    while ((match = filePattern.exec(diff)) !== null) {
      const path = match[2];
      let status: ChangedFile['status'] = 'modified';

      // Look for status indicators in the next few lines
      const nextChunk = diff.substring(match.index, match.index + 200);
      if (nextChunk.includes('new file mode')) {
        status = 'added';
      } else if (nextChunk.includes('deleted file mode')) {
        status = 'deleted';
      } else if (nextChunk.includes('rename from')) {
        status = 'renamed';
      }

      // Count additions and deletions
      const patchMatch = diff.substring(match.index).match(/^@@[\s\S]*?(?=^diff --git|$)/m);
      let additions = 0;
      let deletions = 0;

      if (patchMatch) {
        const lines = patchMatch[0].split('\n');
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) additions++;
          if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }
      }

      files.push({
        path,
        status,
        additions,
        deletions,
        patch: patchMatch?.[0],
      });
    }

    return files;
  }

  /**
   * Find files related to the changed files
   */
  private async findRelatedFiles(changedFiles: ChangedFile[]): Promise<RelatedFile[]> {
    const related: RelatedFile[] = [];
    const seen = new Set(changedFiles.map(f => f.path));

    for (const file of changedFiles) {
      // Find test files for this source file
      const testPatterns = this.getTestFilePatterns(file.path);
      for (const pattern of testPatterns) {
        if (!seen.has(pattern)) {
          related.push({
            path: pattern,
            relationship: 'tests',
            relevance: 0.9,
          });
          seen.add(pattern);
        }
      }

      // Find source file if this is a test file
      const sourceFile = this.getSourceFileFromTest(file.path);
      if (sourceFile && !seen.has(sourceFile)) {
        related.push({
          path: sourceFile,
          relationship: 'tested-by',
          relevance: 0.9,
        });
        seen.add(sourceFile);
      }

      // Find files in the same module/directory
      const sameModule = this.getModuleFiles(file.path);
      for (const modulePath of sameModule) {
        if (!seen.has(modulePath)) {
          related.push({
            path: modulePath,
            relationship: 'same-module',
            relevance: 0.5,
          });
          seen.add(modulePath);
        }
      }

      // Parse imports from the patch to find dependencies
      if (file.patch) {
        const imports = this.extractImports(file.patch);
        for (const imp of imports) {
          if (!seen.has(imp)) {
            related.push({
              path: imp,
              relationship: 'imports',
              relevance: 0.7,
            });
            seen.add(imp);
          }
        }
      }
    }

    // Sort by relevance
    return related.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Identify testable changes from the diff
   */
  private identifyTestableChanges(files: ChangedFile[]): TestableChange[] {
    const changes: TestableChange[] = [];

    for (const file of files) {
      // Skip non-source files
      if (this.isNonSourceFile(file.path)) continue;

      const type = this.classifyChangeType(file);
      const priority = this.assessPriority(file, type);

      changes.push({
        file: file.path,
        type,
        description: this.describeChange(file, type),
        priority,
        suggestedTests: this.suggestTestsForChange(file, type),
      });
    }

    return changes;
  }

  /**
   * Suggest test types based on changes
   */
  private suggestTestTypes(
    files: ChangedFile[],
    changes: TestableChange[]
  ): string[] {
    const types = new Set<string>();

    for (const file of files) {
      // API changes need API tests
      if (file.path.includes('/api/') || file.path.includes('/routes/')) {
        types.add('api');
      }

      // Component changes need component tests
      if (file.path.includes('/components/') || file.path.endsWith('.tsx')) {
        types.add('component');
        types.add('e2e');
      }

      // Service changes need integration tests
      if (file.path.includes('/services/') || file.path.includes('/lib/')) {
        types.add('integration');
      }

      // Database/model changes need data tests
      if (file.path.includes('/models/') || file.path.includes('/db/')) {
        types.add('integration');
        types.add('api');
      }
    }

    // Always suggest e2e for significant changes
    if (changes.some(c => c.priority === 'high')) {
      types.add('e2e');
    }

    return Array.from(types);
  }

  /**
   * Identify risk areas in the changes
   */
  private identifyRiskAreas(
    files: ChangedFile[],
    changes: TestableChange[]
  ): RiskArea[] {
    const risks: RiskArea[] = [];

    // Check for security-sensitive changes
    const securityFiles = files.filter(f =>
      f.path.includes('auth') ||
      f.path.includes('security') ||
      f.path.includes('password') ||
      f.path.includes('token')
    );
    if (securityFiles.length > 0) {
      risks.push({
        area: 'Security',
        reason: `Changes to security-sensitive files: ${securityFiles.map(f => f.path).join(', ')}`,
        severity: 'high',
        recommendation: 'Add security-focused tests for authentication and authorization',
      });
    }

    // Check for database/migration changes
    const dbFiles = files.filter(f =>
      f.path.includes('migration') ||
      f.path.includes('/db/') ||
      f.path.includes('schema')
    );
    if (dbFiles.length > 0) {
      risks.push({
        area: 'Data Integrity',
        reason: `Changes to database schema or migrations`,
        severity: 'high',
        recommendation: 'Ensure rollback scenarios are tested',
      });
    }

    // Check for large changes
    const largeChanges = files.filter(f => f.additions + f.deletions > 100);
    if (largeChanges.length > 0) {
      risks.push({
        area: 'Complexity',
        reason: `Large changes in ${largeChanges.length} file(s)`,
        severity: 'medium',
        recommendation: 'Consider breaking into smaller, more focused tests',
      });
    }

    // Check for API changes
    const apiChanges = changes.filter(c => c.type === 'api-change');
    if (apiChanges.length > 0) {
      risks.push({
        area: 'API Compatibility',
        reason: `API changes detected that may affect consumers`,
        severity: 'medium',
        recommendation: 'Add contract tests to verify API compatibility',
      });
    }

    return risks;
  }

  /**
   * Gather context for test generation
   */
  private async gatherContext(
    changedFiles: ChangedFile[],
    relatedFiles: RelatedFile[]
  ): Promise<AnalysisContext> {
    const modules = new Set<string>();
    const endpoints: string[] = [];
    const components: string[] = [];
    const dependencies: string[] = [];
    const patterns: string[] = [];

    for (const file of changedFiles) {
      // Extract module
      const module = this.getModuleName(file.path);
      if (module) modules.add(module);

      // Extract endpoints from API files
      if (file.patch && (file.path.includes('/api/') || file.path.includes('/routes/'))) {
        const eps = this.extractEndpoints(file.patch);
        endpoints.push(...eps);
      }

      // Extract component names
      if (file.path.includes('/components/')) {
        const name = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
        if (name) components.push(name);
      }

      // Extract imports as dependencies
      if (file.patch) {
        const imports = this.extractImports(file.patch);
        dependencies.push(...imports);
      }
    }

    // Get previous test patterns from related test files
    for (const related of relatedFiles.filter(f => f.relationship === 'tests')) {
      patterns.push(related.path);
    }

    return {
      changedModules: Array.from(modules),
      affectedEndpoints: [...new Set(endpoints)],
      affectedComponents: [...new Set(components)],
      dependencies: [...new Set(dependencies)],
      previousTestPatterns: patterns,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapGitHubStatus(status: string): ChangedFile['status'] {
    switch (status) {
      case 'added': return 'added';
      case 'removed': return 'deleted';
      case 'renamed': return 'renamed';
      default: return 'modified';
    }
  }

  private getTestFilePatterns(sourcePath: string): string[] {
    const patterns: string[] = [];
    const ext = sourcePath.split('.').pop();
    const baseName = sourcePath.replace(/\.[^.]+$/, '');

    // Common test file patterns
    patterns.push(`${baseName}.test.${ext}`);
    patterns.push(`${baseName}.spec.${ext}`);
    patterns.push(sourcePath.replace('/src/', '/tests/').replace(/\.[^.]+$/, `.test.${ext}`));
    patterns.push(sourcePath.replace('/src/', '/__tests__/'));

    return patterns;
  }

  private getSourceFileFromTest(testPath: string): string | null {
    if (!testPath.includes('.test.') && !testPath.includes('.spec.')) {
      return null;
    }

    return testPath
      .replace('.test.', '.')
      .replace('.spec.', '.')
      .replace('/__tests__/', '/src/')
      .replace('/tests/', '/src/');
  }

  private getModuleFiles(filePath: string): string[] {
    // Return index file of the same directory
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    return [`${dir}/index.ts`, `${dir}/index.js`];
  }

  private extractImports(patch: string): string[] {
    const imports: string[] = [];
    const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = importPattern.exec(patch)) !== null) {
      if (!match[1].startsWith('.')) continue;  // Skip node_modules
      imports.push(match[1]);
    }
    while ((match = requirePattern.exec(patch)) !== null) {
      if (!match[1].startsWith('.')) continue;
      imports.push(match[1]);
    }

    return imports;
  }

  private extractEndpoints(patch: string): string[] {
    const endpoints: string[] = [];
    const patterns = [
      /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi,
      /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi,
      /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"]([^'"]+)['"]/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(patch)) !== null) {
        endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
      }
    }

    return endpoints;
  }

  private isNonSourceFile(path: string): boolean {
    const nonSourcePatterns = [
      /package(-lock)?\.json$/,
      /\.md$/,
      /\.yml$/,
      /\.yaml$/,
      /\.lock$/,
      /\.gitignore$/,
      /\.env/,
      /node_modules\//,
      /dist\//,
      /build\//,
    ];
    return nonSourcePatterns.some(p => p.test(path));
  }

  private classifyChangeType(file: ChangedFile): TestableChange['type'] {
    if (file.status === 'added') return 'new-feature';

    // Check patch content for clues
    if (file.patch) {
      if (file.patch.includes('fix') || file.patch.includes('bug')) return 'bug-fix';
      if (file.patch.includes('refactor')) return 'refactor';
    }

    // Check file path
    if (file.path.includes('/api/') || file.path.includes('/routes/')) return 'api-change';
    if (file.path.includes('/components/') || file.path.endsWith('.tsx')) return 'ui-change';

    return 'refactor';
  }

  private assessPriority(
    file: ChangedFile,
    type: TestableChange['type']
  ): TestableChange['priority'] {
    // High priority for security, API, or large changes
    if (file.path.includes('auth') || file.path.includes('security')) return 'high';
    if (type === 'api-change') return 'high';
    if (file.additions + file.deletions > 100) return 'high';

    // Medium for new features and UI changes
    if (type === 'new-feature') return 'medium';
    if (type === 'ui-change') return 'medium';

    return 'low';
  }

  private describeChange(file: ChangedFile, type: TestableChange['type']): string {
    const action = file.status === 'added' ? 'Added' :
                   file.status === 'deleted' ? 'Deleted' :
                   file.status === 'renamed' ? 'Renamed' : 'Modified';

    return `${action} ${file.path} (${file.additions}+, ${file.deletions}-)`;
  }

  private suggestTestsForChange(
    file: ChangedFile,
    type: TestableChange['type']
  ): string[] {
    const tests: string[] = [];

    switch (type) {
      case 'api-change':
        tests.push('Verify endpoint response format');
        tests.push('Test error handling');
        tests.push('Check authentication/authorization');
        break;
      case 'ui-change':
        tests.push('Verify component renders correctly');
        tests.push('Test user interactions');
        tests.push('Check responsive behavior');
        break;
      case 'new-feature':
        tests.push('Happy path scenario');
        tests.push('Edge cases');
        tests.push('Error states');
        break;
      case 'bug-fix':
        tests.push('Regression test for the fixed bug');
        tests.push('Related edge cases');
        break;
      case 'refactor':
        tests.push('Verify existing behavior unchanged');
        break;
    }

    return tests;
  }

  private getModuleName(filePath: string): string | null {
    const match = filePath.match(/src\/([^/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * GitHub PR file structure (from API)
 */
export interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

/**
 * Format analysis result as markdown for PR comments
 */
export function formatAnalysisAsMarkdown(analysis: DiffAnalysis): string {
  let md = '## 🔍 PR Diff Analysis\n\n';

  // Changed files
  md += '### Changed Files\n\n';
  for (const file of analysis.changedFiles) {
    const icon = file.status === 'added' ? '➕' :
                 file.status === 'deleted' ? '➖' :
                 file.status === 'renamed' ? '📝' : '✏️';
    md += `- ${icon} \`${file.path}\` (+${file.additions}/-${file.deletions})\n`;
  }

  // Related files
  if (analysis.relatedFiles.length > 0) {
    md += '\n### Related Files\n\n';
    for (const file of analysis.relatedFiles.slice(0, 5)) {
      md += `- \`${file.path}\` (${file.relationship})\n`;
    }
  }

  // Testable changes
  md += '\n### Testable Changes\n\n';
  for (const change of analysis.testableChanges) {
    const priority = change.priority === 'high' ? '🔴' :
                     change.priority === 'medium' ? '🟡' : '🟢';
    md += `- ${priority} **${change.type}**: ${change.description}\n`;
    for (const test of change.suggestedTests.slice(0, 3)) {
      md += `  - ${test}\n`;
    }
  }

  // Risk areas
  if (analysis.riskAreas.length > 0) {
    md += '\n### Risk Areas\n\n';
    for (const risk of analysis.riskAreas) {
      const severity = risk.severity === 'high' ? '⚠️' :
                       risk.severity === 'medium' ? '⚡' : 'ℹ️';
      md += `- ${severity} **${risk.area}**: ${risk.reason}\n`;
      md += `  - Recommendation: ${risk.recommendation}\n`;
    }
  }

  // Suggested test types
  md += '\n### Suggested Test Types\n\n';
  md += analysis.suggestedTestTypes.map(t => `- ${t}`).join('\n');

  return md;
}

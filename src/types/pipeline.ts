export interface RepoFile {
  path: string;
  name: string;
  content: string;
}

export interface Repository {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  defaultBranch: string;
}

export interface CodeIssue {
  id?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'bug' | 'security' | 'performance' | 'quality' | 'architecture' | 'style';
  file: string;
  line: string;
  description: string;
  suggestion: string;
  solved?: boolean;
  solvedAt?: string;
}

export interface AnalysisResult {
  summary: string;
  issues: CodeIssue[];
  solvedIssues?: CodeIssue[];
  metrics: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    solved?: number;
  };
}

export interface FixedFile {
  path: string;
  originalIssues: string[];
  content: string;
  changes?: string[];
}

export interface FixResult {
  summary: string;
  fixedFiles: FixedFile[];
  improvements: string[];
  issuesSolved: number;
  appliedToCodebase?: boolean;
}

export interface TestResult {
  summary: string;
  passed: boolean;
  testResults: {
    scenario: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
  }[];
  errors: {
    type: string;
    file: string;
    description: string;
    stackTrace?: string;
  }[];
  coverage: {
    estimated: string;
  };
  preview?: {
    html: string;
    description: string;
  };
}

export interface MeasureResult {
  overallScore: number;
  metrics: {
    complexity: { score: number; details: string };
    maintainability: { score: number; details: string };
    performance: { score: number; details: string };
    security: { score: number; details: string };
    testability: { score: number; details: string };
  };
  technicalDebt: {
    hours: number;
    items: string[];
  };
  recommendations: string[];
}

export type PipelineStage = 
  | 'idle'
  | 'cloning'
  | 'analyzing'
  | 'fixing'
  | 'testing'
  | 'measuring'
  | 'recording'
  | 'approval'
  | 'deploying'
  | 'complete'
  | 'error';

export interface PipelineState {
  stage: PipelineStage;
  repository: Repository | null;
  files: RepoFile[];
  analysis: AnalysisResult | null;
  fixes: FixResult | null;
  testResults: TestResult | null;
  metrics: MeasureResult | null;
  logs: LogEntry[];
  error: string | null;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export type ReproductionViolation = {
  title: string;
  steps: string[];
};

export type WcagRow = {
  criteria: string;
  requirementSummary: string;
  conformanceLevel: string;
  remarks: string;
  howToVerify: string;
  howToReproduce: string;
  relevantFiles: string;
  reproductionViolations?: ReproductionViolation[];
};

export type WcagTable = {
  title: string;
  level: 'A' | 'AA';
  rows: WcagRow[];
};

export type WcagAssessment = {
  generatedAt: string | null;
  isPlaceholder?: boolean;
  source?: {
    docxPath?: string | null;
    docxCriteriaMatched?: number;
    usedBuiltInCriteriaFallback?: boolean;
  };
  aiAudit?: {
    model?: string | null;
    batches?: number;
    filesIndexed?: number;
    rowsReviewed?: number;
    checkpointCache?: string | null;
  };
  runtimeEvidence?: {
    enabled?: boolean;
    available?: boolean;
    baseUrl?: string | null;
    backendBaseUrl?: string | null;
    backendAvailable?: boolean | null;
    frontendAvailable?: boolean | null;
    loginUserKey?: string | null;
    loginSucceeded?: boolean | null;
    routesVisited?: number;
    workflowsVisited?: number;
    issueSignals?: number;
  };
  summary: {
    total: number;
    byConformance: Record<string, number>;
  };
  tables: WcagTable[];
};

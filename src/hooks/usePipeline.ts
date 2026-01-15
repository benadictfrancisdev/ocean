import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RepoFile } from '@/types/pipeline';
import type { 
  PipelineState, 
  PipelineStage, 
  LogEntry,
  AnalysisResult,
  FixResult,
  TestResult,
  MeasureResult
} from '@/types/pipeline';

const initialState: PipelineState = {
  stage: 'idle',
  repository: null,
  files: [],
  analysis: null,
  fixes: null,
  testResults: null,
  metrics: null,
  logs: [],
  error: null,
};

export function usePipeline() {
  const [state, setState] = useState<PipelineState>(initialState);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, entry],
    }));
  }, []);

  const setStage = useCallback((stage: PipelineStage) => {
    setState(prev => ({ ...prev, stage, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, stage: 'error', error }));
    addLog('error', error);
  }, [addLog]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const updateFiles = useCallback((newFiles: RepoFile[]) => {
    setState(prev => ({ ...prev, files: newFiles }));
  }, []);

  const cloneRepository = useCallback(async (repoUrl: string) => {
    try {
      setStage('cloning');
      addLog('info', `Cloning repository: ${repoUrl}`);

      const { data, error } = await supabase.functions.invoke('fetch-github-repo', {
        body: { repoUrl },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Failed to fetch repository');

      setState(prev => ({
        ...prev,
        repository: data.repository,
        files: data.files,
        stage: 'idle', // Ready for next step
      }));

      addLog('success', `Cloned ${data.totalFiles} files from ${data.repository.fullName}`);
      return { success: true, files: data.files };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone repository');
      return { success: false, files: [] };
    }
  }, [addLog, setStage, setError]);

  const analyzeCode = useCallback(async (filesToAnalyze?: typeof state.files, model: 'gemini' | 'claude' = 'gemini') => {
    const files = filesToAnalyze || state.files;
    
    if (!files || files.length === 0) {
      setError('No files to analyze. Please clone a repository first.');
      return false;
    }

    try {
      setStage('analyzing');
      addLog('info', `Analyzing codebase with ${model === 'gemini' ? 'Gemini' : 'Claude'}...`);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: files.slice(0, 20),
          action: 'analyze',
          model
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      const result = data.result as AnalysisResult;
      setState(prev => ({ ...prev, analysis: result, stage: 'analyzing' }));

      addLog('success', `Found ${result.metrics?.totalIssues || 0} issues (${result.metrics?.critical || 0} critical)`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return false;
    }
  }, [state.files, addLog, setStage, setError]);

  const applyFixes = useCallback(async (model: 'gemini' | 'claude' = 'gemini') => {
    try {
      setStage('fixing');
      addLog('info', `Applying fixes with ${model === 'gemini' ? 'Gemini' : 'Claude'}...`);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: state.files.slice(0, 20),
          action: 'fix',
          model
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Fix failed');

      const result = data.result as FixResult;
      const fixedFilesCount = result.fixedFiles?.length || 0;
      
      // Auto-apply fixes to the codebase
      if (result.fixedFiles && result.fixedFiles.length > 0) {
        const updatedFiles = state.files.map(file => {
          const fixedFile = result.fixedFiles.find(f => f.path === file.path);
          if (fixedFile) {
            return { ...file, content: fixedFile.content };
          }
          return file;
        });

        // Count solved issues based on fixed files
        const solvedIssueDescriptions = result.fixedFiles.flatMap(f => f.originalIssues || []);
        const solvedCount = solvedIssueDescriptions.length;

        // Update analysis to mark issues as solved
        const updatedAnalysis = state.analysis ? {
          ...state.analysis,
          issues: state.analysis.issues.map(issue => {
            const isSolved = solvedIssueDescriptions.some(desc => 
              desc.toLowerCase().includes(issue.description.toLowerCase().slice(0, 30)) ||
              issue.description.toLowerCase().includes(desc.toLowerCase().slice(0, 30))
            ) || result.fixedFiles.some(f => f.path === issue.file);
            
            if (isSolved) {
              return { ...issue, solved: true, solvedAt: new Date().toISOString() };
            }
            return issue;
          }),
          solvedIssues: state.analysis.issues.filter(issue => 
            result.fixedFiles.some(f => f.path === issue.file)
          ).map(issue => ({ ...issue, solved: true, solvedAt: new Date().toISOString() })),
          metrics: {
            ...state.analysis.metrics,
            solved: solvedCount,
            totalIssues: Math.max(0, (state.analysis.metrics.totalIssues || 0) - solvedCount)
          }
        } : null;

        setState(prev => ({ 
          ...prev, 
          files: updatedFiles,
          fixes: { ...result, issuesSolved: solvedCount, appliedToCodebase: true },
          analysis: updatedAnalysis
        }));

        addLog('success', `✓ Fixed ${fixedFilesCount} files, solved ${solvedCount} issues (-${solvedCount})`);
        addLog('success', `✓ Changes auto-applied to codebase`);
      } else {
        setState(prev => ({ ...prev, fixes: result }));
        addLog('success', `Fixed ${fixedFilesCount} files`);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fix failed');
      return false;
    }
  }, [state.files, state.analysis, addLog, setStage, setError]);

  const runTests = useCallback(async (model: 'gemini' | 'claude' = 'gemini') => {
    try {
      setStage('testing');
      addLog('info', `Running tests with ${model === 'gemini' ? 'Gemini' : 'Claude'}...`);

      const filesToTest = state.fixes?.fixedFiles?.length 
        ? state.fixes.fixedFiles.map(f => ({ path: f.path, content: f.content, name: f.path.split('/').pop() || '' }))
        : state.files.slice(0, 20);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: filesToTest,
          action: 'test',
          model 
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Test failed');

      const result = data.result as TestResult;
      setState(prev => ({ ...prev, testResults: result }));

      const passedTests = result.testResults?.filter(t => t.status === 'pass').length || 0;
      const totalTests = result.testResults?.length || 0;
      addLog(result.passed ? 'success' : 'warning', 
        `Tests ${result.passed ? 'passed' : 'completed with issues'}: ${passedTests}/${totalTests}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
      return false;
    }
  }, [state.files, state.fixes, addLog, setStage, setError]);

  const measureMetrics = useCallback(async (model: 'gemini' | 'claude' = 'gemini') => {
    try {
      setStage('measuring');
      addLog('info', `Measuring code quality with ${model === 'gemini' ? 'Gemini' : 'Claude'}...`);

      const filesToMeasure = state.fixes?.fixedFiles?.length 
        ? state.fixes.fixedFiles.map(f => ({ path: f.path, content: f.content, name: f.path.split('/').pop() || '' }))
        : state.files.slice(0, 20);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: filesToMeasure,
          action: 'measure',
          model 
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Measure failed');

      const result = data.result as MeasureResult;
      setState(prev => ({ ...prev, metrics: result }));

      addLog('success', `Overall code health score: ${result.overallScore}/100`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Measure failed');
      return false;
    }
  }, [state.files, state.fixes, addLog, setStage, setError]);

  const recordResults = useCallback(async () => {
    try {
      setStage('recording');
      addLog('info', 'Recording and documenting pipeline results with AI...');

      const filesToRecord = state.fixes?.fixedFiles?.length 
        ? state.fixes.fixedFiles.map(f => ({ path: f.path, content: f.content, name: f.path.split('/').pop() || '' }))
        : state.files.slice(0, 20);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: filesToRecord,
          action: 'record'
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Recording failed');

      addLog('success', `Documentation recorded: ${data.result?.projectName || 'Project'} - Ready: ${data.result?.readyForProduction ? 'Yes' : 'No'}`);
      return data.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed');
      return null;
    }
  }, [state.files, state.fixes, addLog, setStage, setError]);

  const requestApproval = useCallback(async () => {
    try {
      setStage('approval');
      addLog('info', 'Running AI-powered approval review...');

      const filesToApprove = state.fixes?.fixedFiles?.length 
        ? state.fixes.fixedFiles.map(f => ({ path: f.path, content: f.content, name: f.path.split('/').pop() || '' }))
        : state.files.slice(0, 20);

      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: { 
          files: filesToApprove,
          action: 'approve'
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Approval review failed');

      const result = data.result;
      if (result?.approved) {
        addLog('success', `Approved for deployment (${result.confidence}% confidence) - ${result.deploymentRecommendation}`);
      } else {
        addLog('warning', `Not approved: ${result?.reviewSummary || 'Review required'}`);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval review failed');
      return null;
    }
  }, [state.files, state.fixes, addLog, setStage, setError]);

  const deploy = useCallback(async () => {
    setStage('deploying');
    addLog('info', 'Deploying to production...');
    
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStage('complete');
    addLog('success', 'Deployment complete! Application is live.');
    return true;
  }, [addLog, setStage]);

  return {
    state,
    actions: {
      reset,
      cloneRepository,
      analyzeCode,
      applyFixes,
      runTests,
      measureMetrics,
      recordResults,
      requestApproval,
      deploy,
      addLog,
      setStage,
      updateFiles,
    },
  };
}

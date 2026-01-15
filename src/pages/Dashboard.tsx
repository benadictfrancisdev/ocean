import { useState } from "react";
import { usePipeline } from "@/hooks/usePipeline";
import Navigation from "@/components/Navigation";
import RepoInput from "@/components/dashboard/RepoInput";
import PipelineTracker from "@/components/dashboard/PipelineTracker";
import PipelineDiagram from "@/components/dashboard/PipelineDiagram";
import PipelineControls from "@/components/dashboard/PipelineControls";

import CodeEditor from "@/components/dashboard/CodeEditor";
import PreviewPanel from "@/components/dashboard/PreviewPanel";
import LogViewer from "@/components/dashboard/LogViewer";
import ResultsPanel from "@/components/dashboard/ResultsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Eye, MessageSquare, Settings } from "lucide-react";

const Dashboard = () => {
  const { state, actions } = usePipeline();
  const [activeTab, setActiveTab] = useState("editor");

  const handleClone = async (url: string) => {
    const result = await actions.cloneRepository(url);
    if (result.success && result.files.length > 0) {
      // Pass files directly to avoid stale state - default to gemini
      await actions.analyzeCode(result.files, 'gemini');
    }
  };

  const handleAnalyze = async (model: 'gemini' | 'claude' = 'gemini') => {
    const success = await actions.analyzeCode(undefined, model);
    if (success) actions.setStage('analyzing');
  };

  const handleFix = async (model: 'gemini' | 'claude' = 'gemini') => {
    const success = await actions.applyFixes(model);
    if (success) actions.setStage('fixing');
  };

  const handleTest = async (model: 'gemini' | 'claude' = 'gemini') => {
    const success = await actions.runTests(model);
    if (success) actions.setStage('testing');
  };

  const handleMeasure = async (model: 'gemini' | 'claude' = 'gemini') => {
    const success = await actions.measureMetrics(model);
    if (success) actions.setStage('measuring');
  };

  const handleRecord = async () => {
    const success = await actions.recordResults();
    if (success) actions.setStage('recording');
  };

  const handleApprove = async () => {
    await actions.requestApproval();
  };

  const handleDeploy = async () => {
    await actions.deploy();
  };

  const handleRun = () => {
    // Trigger a test run with the current files
    handleTest('gemini');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 sea-text">Code Operations Dashboard</h1>
          <p className="text-sea-light/70">
            Clone, analyze, fix, and deploy codebases with AI-powered automation
          </p>
        </div>

        <div className="space-y-6">
          {/* Pipeline Diagram - Visual Architecture */}
          <PipelineDiagram />


          {/* Repository Input */}
          <RepoInput
            onSubmit={handleClone}
            isLoading={state.stage === 'cloning'}
            repository={state.repository}
            onClear={actions.reset}
          />

          {/* Pipeline Status */}
          <PipelineTracker currentStage={state.stage} />

          {/* Pipeline Controls */}
          <PipelineControls
            stage={state.stage}
            hasRepository={!!state.repository}
            onAnalyze={handleAnalyze}
            onFix={handleFix}
            onTest={handleTest}
            onMeasure={handleMeasure}
            onRecord={handleRecord}
            onApprove={handleApprove}
            onDeploy={handleDeploy}
            onReset={actions.reset}
          />

          {/* Main Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-sea-light/5 p-1 border border-sea-light/20">
              <TabsTrigger value="editor" className="flex items-center gap-2 data-[state=active]:bg-sea-wave/30 data-[state=active]:text-sea-light">
                <Code2 className="w-4 h-4" />
                Code Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-sea-wave/30 data-[state=active]:text-sea-light">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2 data-[state=active]:bg-sea-wave/30 data-[state=active]:text-sea-light">
                <MessageSquare className="w-4 h-4" />
                Results & Chat
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-sea-wave/30 data-[state=active]:text-sea-light">
                <Settings className="w-4 h-4" />
                Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-4">
              <CodeEditor 
                files={state.files} 
                onFilesUpdate={actions.updateFiles}
                onRun={handleRun}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <PreviewPanel 
                files={state.files}
                isRunning={state.stage === 'testing'}
                onRun={handleRun}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              <ResultsPanel
                files={state.files}
                analysis={state.analysis}
                fixes={state.fixes}
                testResults={state.testResults}
                metrics={state.metrics}
                onFilesUpdate={actions.updateFiles}
              />
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <LogViewer logs={state.logs} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

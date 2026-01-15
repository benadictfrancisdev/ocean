import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RepoFile, AnalysisResult, FixResult, TestResult, MeasureResult, CodeIssue } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { FileCode, AlertTriangle, CheckCircle, XCircle, TrendingUp, Eye, MessageSquare, Send, Loader2, Wand2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResultsPanelProps {
  files: RepoFile[];
  analysis: AnalysisResult | null;
  fixes: FixResult | null;
  testResults: TestResult | null;
  metrics: MeasureResult | null;
  onFilesUpdate?: (files: RepoFile[]) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  codeBlocks?: { file: string; code: string; language: string }[];
}

const ResultsPanel = ({ files, analysis, fixes, testResults, metrics, onFilesUpdate }: ResultsPanelProps) => {
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'claude'>('gemini');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("files");
  const [autoApplyPending, setAutoApplyPending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const severityColors = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-orange-500 text-white',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Parse code blocks from AI response
  const parseCodeBlocks = (content: string): { text: string; codeBlocks: { file: string; code: string; language: string }[] } => {
    const codeBlocks: { file: string; code: string; language: string }[] = [];
    let text = content;
    
    // Match FILE: path patterns followed by code blocks
    const fileCodePattern = /FILE:\s*([^\n]+)\n```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = fileCodePattern.exec(content)) !== null) {
      codeBlocks.push({
        file: match[1].trim(),
        language: match[2] || 'typescript',
        code: match[3].trim()
      });
    }

    // Also match standalone code blocks
    if (codeBlocks.length === 0) {
      const standalonePattern = /```(\w+)?\n([\s\S]*?)```/g;
      while ((match = standalonePattern.exec(content)) !== null) {
        codeBlocks.push({
          file: '',
          language: match[1] || 'typescript',
          code: match[2].trim()
        });
      }
    }

    return { text, codeBlocks };
  };

  const handleSendChat = async (prefill?: string, shouldAutoApply?: boolean) => {
    const message = prefill || chatMessage.trim();
    if (!message || isLoading) return;

    setChatMessage("");
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);
    if (shouldAutoApply) setAutoApplyPending(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: {
          files: files.slice(0, 10), // Limit files for faster response
          action: 'chat',
          model: selectedModel,
          issueContext: message,
        },
      });

      if (error) throw error;

      const responseText = data.result?.rawResponse || data.result?.summary || JSON.stringify(data.result);
      const { text, codeBlocks } = parseCodeBlocks(responseText);
      
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: text,
        codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
      }]);

      // Auto-apply fixes if requested and we have valid code blocks
      if (shouldAutoApply && codeBlocks.length > 0 && onFilesUpdate) {
        let appliedCount = 0;
        codeBlocks.forEach(block => {
          if (block.file && block.code) {
            applyCodeFix(block.file, block.code);
            appliedCount++;
          }
        });
        if (appliedCount > 0) {
          toast.success(`Auto-applied ${appliedCount} fix${appliedCount > 1 ? 'es' : ''}`);
        }
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}` 
      }]);
    } finally {
      setIsLoading(false);
      setAutoApplyPending(false);
    }
  };

  const applyCodeFix = (file: string, code: string) => {
    if (!file || !onFilesUpdate) {
      toast.error("Cannot apply fix: No file path specified");
      return;
    }

    const updatedFiles = files.map(f => 
      f.path === file ? { ...f, content: code } : f
    );

    // If file doesn't exist, add it
    const fileExists = files.some(f => f.path === file);
    if (!fileExists) {
      updatedFiles.push({
        path: file,
        name: file.split('/').pop() || file,
        content: code
      });
    }

    onFilesUpdate(updatedFiles);
    toast.success(`Applied fix to ${file}`);
  };

  const copyToClipboard = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  const askAIToFix = (issue: CodeIssue) => {
    // Switch to chat tab first
    setActiveTab("chat");
    
    // Build a detailed fix prompt that ensures proper file path formatting
    const prompt = `Fix this ${issue.severity} ${issue.type} issue in the file "${issue.file}"${issue.line ? ` at line ${issue.line}` : ''}.

Issue: ${issue.description}
${issue.suggestion ? `Suggestion: ${issue.suggestion}` : ''}

IMPORTANT: Return the COMPLETE fixed file content with the exact file path. Format as:
FILE: ${issue.file}
\`\`\`typescript
// complete fixed code here
\`\`\``;

    // Send with auto-apply enabled
    handleSendChat(prompt, true);
  };

  const handleSendButtonClick = () => {
    handleSendChat();
  };

  return (
    <div className="glass-card h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0 flex-wrap">
          <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <FileCode className="w-4 h-4 mr-2" />
            Files ({files.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary relative">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Issues 
            {analysis?.metrics && (
              <span className="ml-1">
                ({analysis.metrics.totalIssues}
                {analysis.metrics.solved && analysis.metrics.solved > 0 && (
                  <span className="text-neon-complete ml-1">-{analysis.metrics.solved}</span>
                )})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <TrendingUp className="w-4 h-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 mt-0 overflow-hidden">
          <div className="grid grid-cols-3 h-full">
            <ScrollArea className="h-[400px] border-r border-border/50">
              <div className="p-2">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedFile?.path === file.path 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-secondary"
                    )}
                  >
                    <div className="truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{file.path}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <div className="col-span-2 p-4 overflow-auto">
              {selectedFile ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{selectedFile.path}</h4>
                  </div>
                  <pre className="text-xs bg-secondary/50 p-4 rounded-lg overflow-auto max-h-[350px]">
                    <code>{selectedFile.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a file to view its contents
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-[400px] p-4">
            {analysis ? (
              <div className="space-y-4">
                {/* Metrics summary with solved count */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-destructive/10 text-center">
                    <div className="text-2xl font-bold text-destructive">{analysis.metrics?.critical || 0}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                    <div className="text-2xl font-bold text-orange-500">{analysis.metrics?.high || 0}</div>
                    <div className="text-xs text-muted-foreground">High</div>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 text-center">
                    <div className="text-2xl font-bold text-warning">{analysis.metrics?.medium || 0}</div>
                    <div className="text-xs text-muted-foreground">Medium</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <div className="text-2xl font-bold">{analysis.metrics?.low || 0}</div>
                    <div className="text-xs text-muted-foreground">Low</div>
                  </div>
                  {/* Solved issues count */}
                  <div className={cn(
                    "p-3 rounded-lg text-center transition-all",
                    analysis.metrics?.solved && analysis.metrics.solved > 0 
                      ? "bg-neon-complete/20 neon-glow" 
                      : "bg-success/10"
                  )}>
                    <div className={cn(
                      "text-2xl font-bold",
                      analysis.metrics?.solved && analysis.metrics.solved > 0 
                        ? "text-neon-complete" 
                        : "text-success"
                    )}>
                      {analysis.metrics?.solved || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Solved</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{analysis.summary}</p>

                {/* Solved Issues Section */}
                {analysis.solvedIssues && analysis.solvedIssues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-neon-complete flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Solved Issues ({analysis.solvedIssues.length})
                    </h4>
                    {analysis.solvedIssues.map((issue, i) => (
                      <div 
                        key={`solved-${i}`} 
                        className="p-3 rounded-lg bg-neon-complete/10 border border-neon-complete/30 animate-neon-flash"
                      >
                        <div className="flex items-start gap-3">
                          <Badge className="bg-neon-complete/20 text-neon-complete border border-neon-complete/50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Solved
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm line-through opacity-70">{issue.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {issue.file} {issue.line && `(line ${issue.line})`}
                            </div>
                            {issue.solvedAt && (
                              <div className="text-xs text-neon-complete mt-1">
                                ✓ Fixed at {new Date(issue.solvedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remaining Issues Section */}
                <div className="space-y-3">
                  {analysis.issues?.filter(issue => !issue.solved).length > 0 && (
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Remaining Issues ({analysis.issues.filter(issue => !issue.solved).length})
                    </h4>
                  )}
                  {analysis.issues?.filter(issue => !issue.solved).map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex items-start gap-3">
                        <Badge className={severityColors[issue.severity]}>{issue.severity}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{issue.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {issue.file} {issue.line && `(line ${issue.line})`}
                          </div>
                          {issue.suggestion && (
                            <div className="text-xs text-primary mt-2">
                              💡 {issue.suggestion}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => askAIToFix(issue)}
                          className="shrink-0"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Fix with AI
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Run analysis to see issues
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden">
          <div className="h-[400px] p-4">
            {testResults?.preview?.html ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Application Preview</h4>
                  <p className="text-xs text-muted-foreground">{testResults.preview.description}</p>
                </div>
                <div className="flex-1 rounded-lg border border-border overflow-hidden bg-white">
                  <iframe
                    srcDoc={testResults.preview.html}
                    className="w-full h-full"
                    sandbox="allow-scripts"
                    title="Code Preview"
                  />
                </div>
              </div>
            ) : testResults ? (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg text-center",
                  testResults.passed ? "bg-success/10" : "bg-destructive/10"
                )}>
                  <div className={cn(
                    "text-2xl font-bold",
                    testResults.passed ? "text-success" : "text-destructive"
                  )}>
                    {testResults.passed ? "All Tests Passed" : "Tests Failed"}
                  </div>
                  <div className="text-sm text-muted-foreground">{testResults.summary}</div>
                </div>

                <div className="space-y-2">
                  {testResults.testResults?.map((test, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      {test.status === 'pass' && <CheckCircle className="w-5 h-5 text-success shrink-0" />}
                      {test.status === 'fail' && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                      {test.status === 'warning' && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{test.scenario}</div>
                        <div className="text-xs text-muted-foreground">{test.details}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {testResults.errors?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Errors</h4>
                    {testResults.errors.map((error, i) => (
                      <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                        <div className="font-medium">{error.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">{error.file}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Run tests to see preview and results
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-[400px] p-4">
            {metrics ? (
              <div className="space-y-4">
                <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="text-5xl font-bold gradient-text">{metrics.overallScore}</div>
                  <div className="text-sm text-muted-foreground">Overall Code Health Score</div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(metrics.metrics || {}).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-secondary/50 text-center">
                      <div className="text-xl font-bold text-primary">{value.score}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>

                {metrics.technicalDebt && (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-warning">Technical Debt</span>
                      <span className="text-2xl font-bold">{metrics.technicalDebt.hours}h</span>
                    </div>
                    <div className="space-y-1">
                      {metrics.technicalDebt.items?.slice(0, 5).map((item, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          • {typeof item === 'string' ? item : (item as { description?: string; priority?: string })?.description || JSON.stringify(item)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {metrics.recommendations && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Recommendations</h4>
                    {metrics.recommendations.slice(0, 5).map((rec, i) => (
                      <div key={i} className="p-2 rounded-lg bg-secondary/50 text-sm">
                        {i + 1}. {typeof rec === 'string' ? rec : (rec as { description?: string; priority?: string })?.description || JSON.stringify(rec)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Run measurements to see metrics
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
          <div className="h-[400px] flex flex-col p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Model:</span>
              <Button
                variant={selectedModel === 'gemini' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedModel('gemini')}
              >
                Gemini
              </Button>
              <Button
                variant={selectedModel === 'claude' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedModel('claude')}
              >
                Claude
              </Button>
            </div>

            <ScrollArea className="flex-1 mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
              {chatHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Ask the AI to help fix issues in your codebase
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn(
                      "p-3 rounded-lg text-sm",
                      msg.role === 'user' 
                        ? "bg-primary/10 ml-8" 
                        : "bg-secondary mr-8"
                    )}>
                      <div className="text-xs text-muted-foreground mb-1 font-medium">
                        {msg.role === 'user' ? 'You' : `AI (${selectedModel})`}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      
                      {/* Render code blocks with action buttons */}
                      {msg.codeBlocks && msg.codeBlocks.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {msg.codeBlocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="rounded-lg border border-border/50 overflow-hidden">
                              {block.file && (
                                <div className="bg-muted/50 px-3 py-1 text-xs font-mono border-b border-border/50 flex items-center justify-between">
                                  <span>{block.file}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => copyToClipboard(block.code, i * 100 + blockIndex)}
                                    >
                                      {copiedIndex === i * 100 + blockIndex ? (
                                        <Check className="w-3 h-3 mr-1" />
                                      ) : (
                                        <Copy className="w-3 h-3 mr-1" />
                                      )}
                                      Copy
                                    </Button>
                                    {onFilesUpdate && block.file && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => applyCodeFix(block.file, block.code)}
                                      >
                                        <Wand2 className="w-3 h-3 mr-1" />
                                        Apply
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              <pre className="text-xs bg-muted/30 p-3 overflow-auto max-h-[200px]">
                                <code>{block.code}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Ask AI to help fix issues, explain code, or suggest improvements..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                className="min-h-[60px] resize-none"
                disabled={isLoading || files.length === 0}
              />
              <Button 
                onClick={handleSendButtonClick} 
                disabled={!chatMessage.trim() || isLoading || files.length === 0}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResultsPanel;

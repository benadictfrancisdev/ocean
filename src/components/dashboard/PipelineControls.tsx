import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  Play, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Rocket,
  Loader2,
  RotateCcw,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PipelineStage } from "@/types/pipeline";

type AIModel = 'gemini' | 'claude';

interface PipelineControlsProps {
  stage: PipelineStage;
  hasRepository: boolean;
  onAnalyze: (model: AIModel) => void;
  onFix: (model: AIModel) => void;
  onTest: (model: AIModel) => void;
  onMeasure: (model: AIModel) => void;
  onRecord: () => void;
  onApprove: () => void;
  onDeploy: () => void;
  onReset: () => void;
}

const PipelineControls = ({
  stage,
  hasRepository,
  onAnalyze,
  onFix,
  onTest,
  onMeasure,
  onRecord,
  onApprove,
  onDeploy,
  onReset,
}: PipelineControlsProps) => {
  const isLoading = ['cloning', 'analyzing', 'fixing', 'testing', 'measuring', 'recording', 'deploying'].includes(stage);

  const getNextAction = () => {
    switch (stage) {
      case 'idle':
        return null; // Need to clone first
      case 'cloning':
        return { label: 'Cloning...', icon: Loader2, disabled: true };
      case 'analyzing':
        return { label: 'Analyzing...', icon: Loader2, disabled: true };
      case 'fixing':
        return { label: 'Fixing...', icon: Loader2, disabled: true };
      case 'testing':
        return { label: 'Testing...', icon: Loader2, disabled: true };
      case 'measuring':
        return { label: 'Measuring...', icon: Loader2, disabled: true };
      case 'recording':
        return { label: 'Recording...', icon: Loader2, disabled: true };
      case 'deploying':
        return { label: 'Deploying...', icon: Loader2, disabled: true };
      case 'approval':
        return { label: 'Approve & Deploy', icon: Rocket, action: onDeploy, disabled: false };
      case 'complete':
        return { label: 'Pipeline Complete', icon: CheckCircle2, disabled: true };
      case 'error':
        return null;
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  if (!hasRepository && stage === 'idle') {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground">
        <p>Paste a GitHub repository URL above to start the pipeline</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Pipeline Controls</h3>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={isLoading}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={stage === 'cloning' ? 'default' : 'glow'}
              size="sm"
              disabled={!hasRepository || stage !== 'idle' && stage !== 'error'}
              className="flex-col h-auto py-3"
            >
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-xs flex items-center gap-1">
                Analyze <ChevronDown className="w-3 h-3" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAnalyze('gemini')}>
              🤖 Analyze with Gemini
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAnalyze('claude')}>
              🧠 Analyze with Claude
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={stage === 'analyzing' ? 'default' : 'glow'}
              size="sm"
              disabled={stage !== 'analyzing' || !hasRepository}
              className="flex-col h-auto py-3"
            >
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-xs flex items-center gap-1">
                Fix <ChevronDown className="w-3 h-3" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onFix('gemini')}>
              🤖 Fix with Gemini
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFix('claude')}>
              🧠 Fix with Claude
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={stage === 'fixing' ? 'default' : 'glow'}
              size="sm"
              disabled={stage !== 'fixing' || !hasRepository}
              className="flex-col h-auto py-3"
            >
              <Play className="w-5 h-5 mb-1" />
              <span className="text-xs flex items-center gap-1">
                Test <ChevronDown className="w-3 h-3" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onTest('gemini')}>
              🤖 Test with Gemini
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTest('claude')}>
              🧠 Test with Claude
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={stage === 'testing' ? 'default' : 'glow'}
              size="sm"
              disabled={stage !== 'testing' || !hasRepository}
              className="flex-col h-auto py-3"
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <span className="text-xs flex items-center gap-1">
                Measure <ChevronDown className="w-3 h-3" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onMeasure('gemini')}>
              🤖 Measure with Gemini
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMeasure('claude')}>
              🧠 Measure with Claude
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={stage === 'measuring' ? 'default' : 'glow'}
          size="sm"
          onClick={onRecord}
          disabled={stage !== 'measuring' || !hasRepository}
          className="flex-col h-auto py-3"
        >
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-xs">Record</span>
        </Button>

        <Button
          variant={stage === 'recording' ? 'default' : 'glow'}
          size="sm"
          onClick={onApprove}
          disabled={stage !== 'recording' || !hasRepository}
          className="flex-col h-auto py-3"
        >
          <CheckCircle2 className="w-5 h-5 mb-1" />
          <span className="text-xs">Approve</span>
        </Button>

        <Button
          variant="hero"
          size="sm"
          onClick={onDeploy}
          disabled={stage !== 'approval'}
          className="flex-col h-auto py-3"
        >
          <Rocket className="w-5 h-5 mb-1" />
          <span className="text-xs">Deploy</span>
        </Button>
      </div>

      {stage === 'error' && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">Pipeline encountered an error. Click Reset to try again.</p>
        </div>
      )}

      {stage === 'complete' && (
        <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success">🎉 Pipeline completed successfully! Your code has been deployed.</p>
        </div>
      )}
    </div>
  );
};

export default PipelineControls;

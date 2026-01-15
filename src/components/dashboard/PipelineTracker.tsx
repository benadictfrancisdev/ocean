import { 
  Copy, 
  Wrench, 
  Play, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Rocket,
  Circle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import type { PipelineStage } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface PipelineTrackerProps {
  currentStage: PipelineStage;
}

const stages = [
  { id: 'cloning', icon: Copy, label: "Clone" },
  { id: 'analyzing', icon: Wrench, label: "Analyze" },
  { id: 'fixing', icon: Wrench, label: "Fix" },
  { id: 'testing', icon: Play, label: "Test" },
  { id: 'measuring', icon: BarChart3, label: "Measure" },
  { id: 'recording', icon: FileText, label: "Record" },
  { id: 'approval', icon: CheckCircle2, label: "Approve" },
  { id: 'deploying', icon: Rocket, label: "Deploy" },
] as const;

const stageOrder: PipelineStage[] = [
  'idle', 'cloning', 'analyzing', 'fixing', 'testing', 
  'measuring', 'recording', 'approval', 'deploying', 'complete'
];

const PipelineTracker = ({ currentStage }: PipelineTrackerProps) => {
  const currentIndex = stageOrder.indexOf(currentStage);
  const isError = currentStage === 'error';
  const isComplete = currentStage === 'complete';

  const getStageStatus = (stageId: string) => {
    const stageIndex = stageOrder.indexOf(stageId as PipelineStage);
    if (isError) return stageIndex < currentIndex ? 'complete' : stageIndex === currentIndex ? 'error' : 'pending';
    if (stageIndex < currentIndex) return 'complete';
    if (stageId === currentStage) return 'active';
    return 'pending';
  };

  return (
    <div className={cn(
      "glass-card p-6 transition-all duration-500 sea-wave",
      isComplete && "neon-glow border-neon-complete/50"
    )}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-sea-light">Pipeline Progress</h3>
        {isComplete && (
          <div className="flex items-center gap-2 animate-neon-flash">
            <Sparkles className="w-4 h-4 text-neon-complete animate-neon-pulse" />
            <span className="text-sm font-semibold neon-text">Complete!</span>
          </div>
        )}
      </div>
      
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-sea-light/20 overflow-hidden rounded-full">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isError && "bg-destructive",
              isComplete && "bg-gradient-to-r from-neon-blue via-neon-white to-neon-complete animate-neon-pulse",
              !isError && !isComplete && "bg-gradient-to-r from-sea-light via-sea-wave to-sea-foam animate-sea-wave"
            )}
            style={{ 
              width: `${Math.max(0, (currentIndex - 1) / (stages.length - 1)) * 100}%` 
            }}
          />
        </div>

        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const status = getStageStatus(stage.id);
            const Icon = stage.icon;
            
            return (
              <div key={stage.id} className="flex flex-col items-center gap-2">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative",
                    status === 'complete' && "neon-complete text-success-foreground",
                    status === 'active' && "bg-sea-wave text-white animate-pulse shadow-lg sea-pulse",
                    status === 'error' && "bg-destructive text-destructive-foreground",
                    status === 'pending' && "bg-sea-light/20 text-sea-light/60"
                  )}
                  style={status === 'complete' ? {
                    boxShadow: '0 0 20px hsl(190 100% 65% / 0.6), 0 0 40px hsl(195 50% 90% / 0.3)'
                  } : status === 'active' ? {
                    boxShadow: '0 0 20px hsl(195 80% 75% / 0.5), 0 0 35px hsl(200 85% 65% / 0.3)'
                  } : undefined}
                >
                  {status === 'complete' && <CheckCircle className="w-5 h-5" />}
                  {status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
                  {status === 'error' && <XCircle className="w-5 h-5" />}
                  {status === 'pending' && <Circle className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-300",
                  status === 'active' && "text-sea-wave sea-text",
                  status === 'complete' && "text-neon-complete font-semibold",
                  status === 'error' && "text-destructive",
                  status === 'pending' && "text-sea-light/50"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Complete Celebration */}
      {isComplete && (
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-neon-blue/10 via-neon-white/10 to-neon-complete/10 border border-neon-complete/30">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-5 h-5 text-neon-complete animate-neon-pulse" />
            <span className="text-sm font-medium text-neon-white">
              All pipeline stages completed successfully!
            </span>
            <Sparkles className="w-5 h-5 text-neon-complete animate-neon-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineTracker;
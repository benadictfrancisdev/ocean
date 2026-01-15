import { useRef, useEffect } from "react";
import type { LogEntry } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer = ({ logs }: LogViewerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const statusColors = {
    info: 'text-muted-foreground',
    success: 'text-neon-complete',
    warning: 'text-warning',
    error: 'text-destructive',
  };

  const statusLabels = {
    info: 'INFO',
    success: 'DONE',
    warning: 'WAIT',
    error: 'FAIL',
  };

  const statusGlow = {
    info: '',
    success: 'drop-shadow-[0_0_8px_hsl(190,100%,65%)]',
    warning: '',
    error: '',
  };

  return (
    <div className="glass-card overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          codeops-ai — pipeline.log
        </span>
      </div>

      <div 
        ref={scrollRef}
        className="p-4 font-mono text-sm space-y-2 max-h-[300px] overflow-auto"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            Waiting for pipeline to start...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={cn(
              "flex items-start gap-3 transition-all",
              log.level === 'success' && "animate-neon-flash"
            )}>
              <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
              <span className={cn(statusColors[log.level], statusGlow[log.level], "shrink-0 w-12 font-semibold")}>
                [{statusLabels[log.level]}]
              </span>
              <span className={cn(
                "text-foreground/90",
                log.level === 'success' && "text-sand"
              )}>{log.message}</span>
            </div>
          ))
        )}
        {logs.length > 0 && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <span className="inline-block w-2 h-4 bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;

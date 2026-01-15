const CodePreview = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Watch it <span className="gradient-text">work</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              See exactly what the AI is doing at every step. Full transparency, complete control.
            </p>
            
            <div className="space-y-4">
              {[
                "Real-time code diff visualization",
                "Step-by-step execution logs",
                "Rollback at any point",
                "Compare before/after metrics"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Code terminal */}
          <div className="glass-card overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">codeops-ai — pipeline.log</span>
            </div>

            {/* Terminal content */}
            <div className="p-6 font-mono text-sm space-y-3 max-h-[400px] overflow-auto">
              <LogLine time="12:34:01" status="info" message="Initiating production clone..." />
              <LogLine time="12:34:03" status="success" message="Clone created: prod-replica-a3f9" />
              <LogLine time="12:34:05" status="info" message="Analyzing codebase structure..." />
              <LogLine time="12:34:12" status="success" message="Identified 847 modules, 12,394 dependencies" />
              <LogLine time="12:34:15" status="info" message="Applying fix: optimize-db-queries" />
              <LogLine time="12:34:18" status="success" message="Modified 3 files, 47 lines changed" />
              <LogLine time="12:34:20" status="info" message="Running traffic simulation..." />
              <LogLine time="12:35:45" status="success" message="Processed 10,000 requests, 0 errors" />
              <LogLine time="12:35:48" status="info" message="Measuring performance delta..." />
              <LogLine time="12:35:52" status="success" message="Latency reduced by 34%, throughput +28%" />
              <LogLine time="12:35:55" status="warning" message="Awaiting approval for production deploy" />
              <div className="flex items-center gap-2 text-primary animate-pulse">
                <span className="inline-block w-2 h-4 bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const LogLine = ({ 
  time, 
  status, 
  message 
}: { 
  time: string; 
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
}) => {
  const statusColors = {
    info: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-destructive',
  };

  const statusLabels = {
    info: 'INFO',
    success: 'DONE',
    warning: 'WAIT',
    error: 'FAIL',
  };

  return (
    <div className="flex items-start gap-4">
      <span className="text-muted-foreground shrink-0">[{time}]</span>
      <span className={`${statusColors[status]} shrink-0 w-12`}>[{statusLabels[status]}]</span>
      <span className="text-foreground/90">{message}</span>
    </div>
  );
};

export default CodePreview;

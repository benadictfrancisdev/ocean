import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  RefreshCw, 
  Maximize2, 
  Minimize2,
  Terminal,
  XCircle,
  FileCode,
  FolderTree
} from "lucide-react";
import type { RepoFile } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreviewPanelProps {
  files: RepoFile[];
  isRunning?: boolean;
  onRun?: () => void;
}

interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

const PreviewPanel = ({ files, isRunning, onRun }: PreviewPanelProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'code'>('code');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set initial selected file
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const mainFile = files.find(f => 
        f.name.includes('index') || 
        f.name.includes('main') || 
        f.name.includes('app') ||
        f.name.includes('App')
      ) || files[0];
      setSelectedFile(mainFile);
    }
  }, [files, selectedFile]);

  // Generate preview HTML from files
  useEffect(() => {
    const htmlFile = files.find(f => f.name === 'index.html' || f.path.endsWith('.html'));
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const jsFiles = files.filter(f => f.path.endsWith('.js'));
    
    if (htmlFile) {
      setPreviewMode('html');
      let html = htmlFile.content;
      
      // Inject CSS
      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (cssContent) {
        html = html.replace('</head>', `<style>${cssContent}</style></head>`);
      }
      
      // Inject JS
      const jsContent = jsFiles.map(f => f.content).join('\n');
      if (jsContent) {
        html = html.replace('</body>', `<script>${jsContent}</script></body>`);
      }
      
      // Add console capture script
      const consoleCapture = `
        <script>
          const originalConsole = { ...console };
          ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = (...args) => {
              originalConsole[method](...args);
              window.parent.postMessage({
                type: 'console',
                method,
                args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
              }, '*');
            };
          });
          window.onerror = (msg, url, line, col, error) => {
            window.parent.postMessage({
              type: 'console',
              method: 'error',
              args: [msg + ' at line ' + line]
            }, '*');
          };
        </script>
      `;
      html = html.replace('<head>', '<head>' + consoleCapture);
      
      setPreviewHtml(html);
    } else {
      setPreviewMode('code');
    }
  }, [files]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        setConsoleLogs(prev => [...prev, {
          type: event.data.method,
          message: event.data.args.join(' '),
          timestamp: new Date()
        }].slice(-100));
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const refreshPreview = () => {
    if (iframeRef.current && previewHtml) {
      iframeRef.current.srcdoc = previewHtml;
    }
    setConsoleLogs([]);
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      'ts': 'text-blue-400',
      'tsx': 'text-blue-400',
      'js': 'text-yellow-400',
      'jsx': 'text-yellow-400',
      'css': 'text-pink-400',
      'html': 'text-orange-400',
      'json': 'text-green-400',
      'md': 'text-gray-400',
    };
    return colors[ext || ''] || 'text-muted-foreground';
  };

  const logColors = {
    log: 'text-foreground',
    error: 'text-destructive',
    warn: 'text-warning',
    info: 'text-primary',
  };

  return (
    <div className={cn(
      "glass-card flex flex-col overflow-hidden transition-all",
      isFullscreen ? "fixed inset-4 z-50" : "h-[600px]"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <div className="w-3 h-3 rounded-full bg-warning" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          {previewMode === 'html' && (
            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">Live HTML</span>
          )}
          {previewMode === 'code' && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Code View</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {previewMode === 'html' && (
            <Button variant="ghost" size="sm" onClick={refreshPreview}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowConsole(!showConsole)}>
            <Terminal className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {onRun && (
            <Button variant="glow" size="sm" onClick={onRun} disabled={isRunning}>
              <Play className="w-4 h-4 mr-1" />
              {isRunning ? 'Running...' : 'Run Tests'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {files.length > 0 && previewMode === 'code' && (
          <div className="w-56 border-r border-border/50 bg-card/50">
            <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Files ({files.length})</span>
            </div>
            <ScrollArea className="h-full">
              <div className="p-2 space-y-0.5">
                {files.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedFile(file)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-secondary/50 transition-colors",
                      selectedFile?.path === file.path && "bg-secondary"
                    )}
                  >
                    <FileCode className={cn("w-3.5 h-3.5", getFileIcon(file.name))} />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={cn("flex-1 overflow-hidden", showConsole ? "h-2/3" : "h-full")}>
            {previewMode === 'html' && previewHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="Code Preview"
              />
            ) : selectedFile ? (
              <div className="h-full bg-[#0d1117] overflow-auto">
                <div className="sticky top-0 bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center gap-2">
                  <FileCode className={cn("w-4 h-4", getFileIcon(selectedFile.name))} />
                  <span className="text-sm text-[#58a6ff] font-mono">{selectedFile.path}</span>
                </div>
                <pre className="p-4 text-sm font-mono text-[#c9d1d9] overflow-auto">
                  <code>
                    {selectedFile.content.split('\n').map((line, i) => (
                      <div key={i} className="flex hover:bg-[#161b22]">
                        <span className="w-12 text-right pr-4 text-[#484f58] select-none shrink-0">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre">{line || ' '}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Clone a repository to preview files</p>
                </div>
              </div>
            )}
          </div>

          {/* Console */}
          {showConsole && (
            <div className="h-1/3 border-t border-border/50 bg-card flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Console</span>
                <Button variant="ghost" size="sm" onClick={clearConsole} className="h-6 px-2">
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-2 font-mono text-xs">
                {consoleLogs.length > 0 ? (
                  consoleLogs.map((log, i) => (
                    <div key={i} className={cn("py-0.5", logColors[log.type])}>
                      <span className="text-muted-foreground mr-2">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      {log.message}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">
                    {previewMode === 'html' 
                      ? 'Console output from the preview will appear here...'
                      : 'Clone a repository and run tests to see output...'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;

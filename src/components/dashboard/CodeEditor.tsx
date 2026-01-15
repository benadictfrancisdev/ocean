import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCode, 
  Plus, 
  X, 
  Play, 
  Save,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import type { RepoFile } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CodeEditorProps {
  files: RepoFile[];
  onFilesUpdate: (files: RepoFile[]) => void;
  onRun?: () => void;
}

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
}

const CodeEditor = ({ files, onFilesUpdate, onRun }: CodeEditorProps) => {
  const [openFiles, setOpenFiles] = useState<RepoFile[]>([]);
  const [activeFile, setActiveFile] = useState<RepoFile | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, string>>(new Map());

  // Build file tree from flat file list
  const buildFileTree = (files: RepoFile[]): FileTreeItem[] => {
    const root: FileTreeItem[] = [];
    const folderMap = new Map<string, FileTreeItem>();

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (isFile) {
          const parentPath = parts.slice(0, -1).join('/');
          const item: FileTreeItem = { name: part, path: file.path, type: 'file' };
          
          if (parentPath) {
            const parent = folderMap.get(parentPath);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(item);
            }
          } else {
            root.push(item);
          }
        } else if (!folderMap.has(currentPath)) {
          const folder: FileTreeItem = { 
            name: part, 
            path: currentPath, 
            type: 'folder', 
            children: [] 
          };
          folderMap.set(currentPath, folder);
          
          const parentPath = parts.slice(0, index).join('/');
          if (parentPath && folderMap.has(parentPath)) {
            folderMap.get(parentPath)!.children!.push(folder);
          } else if (!parentPath) {
            root.push(folder);
          }
        }
      });
    });

    return root;
  };

  const fileTree = buildFileTree(files);

  const openFile = (file: RepoFile) => {
    if (!openFiles.find(f => f.path === file.path)) {
      setOpenFiles([...openFiles, file]);
    }
    setActiveFile(file);
  };

  const closeFile = (path: string) => {
    setOpenFiles(openFiles.filter(f => f.path !== path));
    if (activeFile?.path === path) {
      setActiveFile(openFiles.find(f => f.path !== path) || null);
    }
    setUnsavedChanges(prev => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  };

  const handleEditorChange = (value: string | undefined, path: string) => {
    if (value !== undefined) {
      setUnsavedChanges(prev => new Map(prev).set(path, value));
    }
  };

  const saveFile = (path: string) => {
    const newContent = unsavedChanges.get(path);
    if (newContent !== undefined) {
      const updatedFiles = files.map(f => 
        f.path === path ? { ...f, content: newContent } : f
      );
      onFilesUpdate(updatedFiles);
      setUnsavedChanges(prev => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });
      toast.success(`Saved ${path}`);
    }
  };

  const saveAllFiles = () => {
    if (unsavedChanges.size === 0) return;
    
    const updatedFiles = files.map(f => {
      const newContent = unsavedChanges.get(f.path);
      return newContent !== undefined ? { ...f, content: newContent } : f;
    });
    onFilesUpdate(updatedFiles);
    setUnsavedChanges(new Map());
    toast.success(`Saved ${unsavedChanges.size} file(s)`);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      css: 'css',
      scss: 'scss',
      html: 'html',
      md: 'markdown',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  const renderFileTree = (items: FileTreeItem[], depth = 0): JSX.Element[] => {
    return items.map(item => {
      if (item.type === 'folder') {
        const isExpanded = expandedFolders.has(item.path);
        return (
          <div key={item.path}>
            <button
              onClick={() => toggleFolder(item.path)}
              className="w-full flex items-center gap-1 px-2 py-1 hover:bg-secondary/50 text-sm"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <FolderOpen className="w-4 h-4 text-yellow-500" />
              <span className="truncate">{item.name}</span>
            </button>
            {isExpanded && item.children && renderFileTree(item.children, depth + 1)}
          </div>
        );
      }
      
      const file = files.find(f => f.path === item.path);
      if (!file) return null;
      
      return (
        <button
          key={item.path}
          onClick={() => openFile(file)}
          className={cn(
            "w-full flex items-center gap-1 px-2 py-1 text-sm transition-colors",
            activeFile?.path === item.path 
              ? "bg-primary/10 text-primary" 
              : "hover:bg-secondary/50"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="truncate">{item.name}</span>
          {unsavedChanges.has(item.path) && (
            <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
          )}
        </button>
      );
    });
  };

  return (
    <div className="glass-card h-[500px] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground">Code Editor</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={saveAllFiles}
            disabled={unsavedChanges.size === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Save All
          </Button>
          {onRun && (
            <Button variant="glow" size="sm" onClick={onRun}>
              <Play className="w-4 h-4 mr-1" />
              Run
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-48 border-r border-border/50 flex flex-col">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            Explorer
          </div>
          <ScrollArea className="flex-1">
            {files.length > 0 ? (
              renderFileTree(fileTree)
            ) : (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                No files loaded
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Open file tabs */}
          {openFiles.length > 0 && (
            <div className="flex items-center border-b border-border/50 overflow-x-auto">
              {openFiles.map(file => (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm border-r border-border/50 cursor-pointer",
                    activeFile?.path === file.path 
                      ? "bg-secondary/50 text-foreground" 
                      : "text-muted-foreground hover:bg-secondary/30"
                  )}
                  onClick={() => setActiveFile(file)}
                >
                  <FileCode className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  {unsavedChanges.has(file.path) && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(file.path);
                    }}
                    className="hover:bg-secondary rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguage(activeFile.path)}
                value={unsavedChanges.get(activeFile.path) ?? activeFile.content}
                onChange={(value) => handleEditorChange(value, activeFile.path)}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a file to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;

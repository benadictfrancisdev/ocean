import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, Loader2, X } from "lucide-react";

interface RepoInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  repository?: { fullName: string; description: string } | null;
  onClear: () => void;
}

const RepoInput = ({ onSubmit, isLoading, repository, onClear }: RepoInputProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  if (repository) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{repository.fullName}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {repository.description || "No description"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6">
      <label className="block text-sm font-medium mb-3 text-muted-foreground">
        GitHub Repository URL
      </label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://github.com/username/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-12 h-12 bg-secondary/50 border-border/50 focus:border-primary"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          variant="hero" 
          size="lg" 
          disabled={!url.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Cloning...
            </>
          ) : (
            "Clone"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Enter a public GitHub repository URL to begin the code operations pipeline
      </p>
    </form>
  );
};

export default RepoInput;

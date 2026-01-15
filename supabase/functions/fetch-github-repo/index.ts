import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  download_url?: string;
}

async function fetchRepoContents(owner: string, repo: string, path: string = ""): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CodeOps-AI",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchFileContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  return response.text();
}

async function fetchAllFiles(
  owner: string, 
  repo: string, 
  path: string = "",
  files: { path: string; content: string; name: string }[] = [],
  maxFiles: number = 50
): Promise<{ path: string; content: string; name: string }[]> {
  if (files.length >= maxFiles) return files;

  const contents = await fetchRepoContents(owner, repo, path);
  
  for (const item of contents) {
    if (files.length >= maxFiles) break;
    
    if (item.type === "file" && item.download_url) {
      // Only fetch code files
      const ext = item.name.split('.').pop()?.toLowerCase();
      const codeExtensions = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'md', 'yaml', 'yml', 'go', 'rs', 'rb', 'php'];
      
      if (ext && codeExtensions.includes(ext)) {
        try {
          const content = await fetchFileContent(item.download_url);
          files.push({
            path: item.path,
            name: item.name,
            content: content.slice(0, 10000), // Limit content size
          });
        } catch (e) {
          console.error(`Failed to fetch ${item.path}:`, e);
        }
      }
    } else if (item.type === "dir" && !item.name.startsWith('.') && item.name !== 'node_modules') {
      await fetchAllFiles(owner, repo, item.path, files, maxFiles);
    }
  }
  
  return files;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl } = await req.json();
    
    if (!repoUrl) {
      return new Response(
        JSON.stringify({ error: "Repository URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse GitHub URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(/\.git$/, '');

    console.log(`Fetching repository: ${owner}/${repo}`);

    // Fetch repository info
    const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CodeOps-AI",
      },
    });

    if (!repoInfoResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Repository not found or not accessible: ${owner}/${repo}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repoInfo = await repoInfoResponse.json();
    
    // Fetch files
    const files = await fetchAllFiles(owner, repo);

    return new Response(
      JSON.stringify({
        success: true,
        repository: {
          name: repoInfo.name,
          fullName: repoInfo.full_name,
          description: repoInfo.description,
          language: repoInfo.language,
          stars: repoInfo.stargazers_count,
          defaultBranch: repoInfo.default_branch,
        },
        files,
        totalFiles: files.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching repository:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch repository" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

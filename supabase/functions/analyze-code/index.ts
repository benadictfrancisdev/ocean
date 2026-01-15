import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to call Groq with Llama model
async function callGroqLlama(systemPrompt: string, userPrompt: string, apiKey: string) {
  console.log("Using Groq with meta-llama/llama-4-maverick-17b-128e-instruct");
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Helper function to call Lovable AI Gateway
async function callLovableAI(systemPrompt: string, userPrompt: string, model: string, apiKey: string) {
  console.log(`Using Lovable AI with ${model}`);
  
  // Use max_completion_tokens for OpenAI models, max_tokens for Gemini
  const isOpenAI = model.startsWith("openai/");
  const tokenParam = isOpenAI ? { max_completion_tokens: 4096 } : { max_tokens: 4096 };
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      ...tokenParam,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add more credits.");
    }
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, action, issueContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Files array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";
    let useGroq = false;

    // Limit content size to stay under token limits (reduced for Groq compatibility)
    const maxContentPerFile = 1500;
    const maxFiles = 10;
    const limitedFiles = files.slice(0, maxFiles);
    
    const filesContext = limitedFiles.map((f: { path: string; content: string }) => {
      const content = f.content.length > maxContentPerFile 
        ? f.content.slice(0, maxContentPerFile) + "\n... (truncated)" 
        : f.content;
      return `--- ${f.path} ---\n${content}`;
    }).join("\n\n");

    switch (action) {
      case "analyze":
        systemPrompt = `You are an expert code analyst. Analyze the codebase and provide:
1. Critical bugs and errors
2. Security vulnerabilities  
3. Performance issues
4. Best practices violations
5. Suggested improvements

Be concise. Return JSON ONLY:
{
  "summary": "2-3 sentence assessment",
  "issues": [{"severity": "critical|high|medium|low", "type": "bug|security|performance|style", "file": "path", "line": "line", "description": "issue", "suggestion": "fix"}],
  "metrics": {"totalIssues": n, "critical": n, "high": n, "medium": n, "low": n},
  "nextSteps": ["recommended actions"]
}`;
        userPrompt = `Analyze this codebase:\n\n${filesContext}`;
        break;

      case "fix":
        useGroq = true;
        systemPrompt = `You are an expert code fixer. Generate complete, production-ready fixed code.
${issueContext ? `\nIssues to fix:\n${issueContext}\n` : ''}

Return JSON:
{
  "summary": "What was fixed",
  "fixedFiles": [{"path": "path", "content": "COMPLETE fixed code", "changes": ["changes"]}],
  "improvements": ["improvements"]
}`;
        userPrompt = `Fix issues in this code:\n\n${filesContext}`;
        break;

      case "test":
        systemPrompt = `You are a test engineer. Simulate running the codebase.

Return JSON:
{
  "summary": "Test results",
  "passed": boolean,
  "testResults": [{"scenario": "test", "status": "pass|fail|warning", "details": "result"}],
  "errors": [{"type": "runtime|logic", "file": "path", "description": "error", "fix": "solution"}],
  "coverage": {"estimated": "percentage"},
  "preview": {"html": "<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:20px;background:#0f172a;color:#e2e8f0;}</style></head><body><h1>Preview</h1><p>Generated preview</p></body></html>", "description": "preview info"}
}`;
        userPrompt = `Test this codebase:\n\n${filesContext}`;
        break;

      case "measure":
        systemPrompt = `You are a code metrics expert. Provide metrics:

Return JSON:
{
  "overallScore": number,
  "grade": "A|B|C|D|F",
  "metrics": {
    "complexity": {"score": n, "details": "info"},
    "maintainability": {"score": n, "details": "info"},
    "performance": {"score": n, "details": "info"},
    "security": {"score": n, "details": "info"}
  },
  "technicalDebt": {"hours": n, "items": ["items"]},
  "recommendations": [{"title": "rec", "impact": "high|medium|low"}]
}`;
        userPrompt = `Measure this codebase:\n\n${filesContext}`;
        break;

      case "record":
        systemPrompt = `You are a documentation expert. Record the analysis:

Return JSON:
{
  "projectName": "name",
  "timestamp": "${new Date().toISOString()}",
  "summary": "Executive summary",
  "filesSummary": {"total": n, "byType": {"ts": n, "tsx": n, "js": n}},
  "architectureOverview": "architecture",
  "keyComponents": [{"name": "comp", "purpose": "purpose"}],
  "readyForProduction": boolean,
  "recommendations": ["recs"]
}`;
        userPrompt = `Document this codebase:\n\n${filesContext}`;
        break;

      case "approve":
        useGroq = true;
        systemPrompt = `You are a senior reviewer. Evaluate deployment readiness.

Return JSON:
{
  "approved": boolean,
  "confidence": number,
  "reviewSummary": "summary",
  "securityCheck": {"passed": boolean, "findings": ["findings"]},
  "qualityCheck": {"passed": boolean, "score": n},
  "performanceCheck": {"passed": boolean, "findings": ["findings"]},
  "deploymentRisks": [{"risk": "risk", "severity": "critical|high|medium|low"}],
  "deploymentRecommendation": "deploy|hold|reject"
}`;
        userPrompt = `Review for deployment:\n\n${filesContext}`;
        break;

      case "chat":
        useGroq = true;
        systemPrompt = `You are an AI coding assistant. Fix code issues.

Format code fixes as:
FILE: path/to/file.ts
\`\`\`typescript
// complete fixed code
\`\`\``;
        userPrompt = issueContext ? 
          `${issueContext}\n\nCode:\n${filesContext}` : 
          `Help with this code:\n\n${filesContext}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    let aiResponse: string | null = null;
    let modelUsed = "";

    // Use Groq/Llama for code generation tasks
    if (useGroq && GROQ_API_KEY) {
      try {
        aiResponse = await callGroqLlama(systemPrompt, userPrompt, GROQ_API_KEY);
        modelUsed = "meta-llama/llama-4-maverick-17b-128e-instruct (Groq)";
      } catch (err) {
        console.error("Groq failed, falling back to Lovable AI:", err);
        if (LOVABLE_API_KEY) {
          aiResponse = await callLovableAI(systemPrompt, userPrompt, "google/gemini-2.5-flash", LOVABLE_API_KEY);
          modelUsed = "google/gemini-2.5-flash (fallback)";
        }
      }
    } else if (LOVABLE_API_KEY) {
      const model = "google/gemini-2.5-flash";
      aiResponse = await callLovableAI(systemPrompt, userPrompt, model, LOVABLE_API_KEY);
      modelUsed = model;
    }

    if (!aiResponse) {
      throw new Error("No AI API key configured or all AI calls failed");
    }

    console.log(`Completed ${action} with ${modelUsed}`);

    // Try to parse as JSON
    let result;
    try {
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiResponse;
      result = JSON.parse(jsonStr);
    } catch {
      result = { rawResponse: aiResponse };
    }

    return new Response(
      JSON.stringify({ success: true, action, result, model: modelUsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-code:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
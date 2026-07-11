import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// High limits for raw chat files/HTML uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// In-memory sessions
interface ImportSession {
  source: string;
  url: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  createdAt: number;
}

const importSessions = new Map<string, ImportSession>();

// Cleanup routine: run periodically to prune sessions older than 10 mins
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of importSessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      importSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Bookmarklet POST target (uses URL-encoded form POST or JSON)
app.post("/api/import-post", (req, res) => {
  try {
    const rawData = req.body.chatData;
    if (!rawData) {
      return res.status(400).send("No chatData provided.");
    }

    let parsed;
    try {
      parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (e) {
      return res.status(400).send("Invalid JSON in chatData.");
    }

    const { source, url, title, messages } = parsed;
    if (!Array.isArray(messages)) {
      return res.status(400).send("Messages must be an array.");
    }

    const importId = "imp_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    importSessions.set(importId, {
      source: source || "unknown",
      url: url || "",
      title: title || "Imported Chat",
      messages,
      createdAt: Date.now()
    });

    // Redirect user back to the application home screen with the importId query parameter
    res.redirect(`/?importId=${importId}`);
  } catch (error: any) {
    console.error("Error in /api/import-post:", error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

// Get import session by ID
app.get("/api/get-import", (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "Missing session ID" });
  }

  const session = importSessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "Session expired or not found" });
  }

  // One-time retrieval to keep memory clear
  importSessions.delete(id);

  res.json({ success: true, session });
});

// Parse raw HTML or messy text via Gemini
app.post("/api/parse-raw", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "No text provided to parse" });
    }

    // Call Gemini to parse
    const prompt = `
You are a highly advanced Chat Transcript Extractor.
We have received a raw, messy copy-paste or saved document of a conversation with an AI platform (e.g. Claude, ChatGPT, Gemini, DeepSeek). It might contain user names, timestamps, UI buttons, sidebars, avatar images, and fragmented lines.

Your task is to parse through this messy content, filter out all UI noise, and reconstruct the complete, sequential dialogue between the human (user) and the AI (assistant).

Please return a clean JSON object containing:
1. 'source': The estimated platform (e.g., 'Claude', 'ChatGPT', 'Gemini', 'DeepSeek', 'Unknown')
2. 'title': A fitting, descriptive title for this conversation based on its contents
3. 'messages': An array of objects, each containing:
   - 'role': MUST be either 'user' (for human) or 'assistant' (for AI)
   - 'text': The full content of that message in standard markdown format (keep code blocks, lists, bold text, etc., intact and clean).

Here is the raw conversation text or HTML content:
--------------------------------------------------
${rawText.slice(0, 150000)}
--------------------------------------------------
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            source: { type: Type.STRING, description: "Identified platform: Claude, ChatGPT, Gemini, DeepSeek, or Unknown" },
            title: { type: Type.STRING, description: "Descriptive title of the conversation" },
            messages: {
              type: Type.ARRAY,
              description: "Sequential conversation messages",
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING, description: "Must be 'user' or 'assistant'" },
                  text: { type: Type.STRING, description: "Message content parsed in clean markdown" }
                },
                required: ["role", "text"]
              }
            }
          },
          required: ["source", "title", "messages"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini parser.");
    }

    const parsed = JSON.parse(resultText);
    res.json({ success: true, ...parsed });

  } catch (error: any) {
    console.error("Error in /api/parse-raw:", error);
    res.status(500).json({ error: error.message || "Failed to parse transcript" });
  }
});

// Generate custom optimized prompting context
app.post("/api/generate-context", async (req, res) => {
  try {
    const { messages, targetAi, goal, customInstructions, scratchpadNotes } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided." });
    }

    const formattedTranscript = messages.map(m => {
      const label = m.role === 'user' ? 'HUMAN / USER' : 'AI ASSISTANT';
      return `[${label}]:\n${m.text}\n--------------------`;
    }).join('\n\n');

    const prompt = `
You are a context optimization expert. We have a chat history that needs to be imported into another AI platform (${targetAi}) for the following goal: "${goal}".
${customInstructions ? `Custom requirements: "${customInstructions}"\n` : ''}
${scratchpadNotes ? `Additional custom user research/scratchpad notes to append: "${scratchpadNotes}"\n` : ''}

Your task is to generate three pieces of output:
1. A **highly optimized, ready-to-copy target prompt** specifically formatted for the destination AI (${targetAi}). It should set the persona, cleanly embed the conversation transcript, and explicitly prompt the destination AI to fulfill the selected goal (${goal}). If custom user research/scratchpad notes are provided, make sure they are prominently positioned so the target AI treats them as high-priority constraints.
2. A **compelling Markdown Summary** of the conversation, extracting the key topics, technical decisions, active code blocks, and next steps/questions.
3. A **Compacted Context** version of the transcript that condenses verbose text and boilerplate into density-packed essential terms/sentences to save token budget in the target AI, whilst keeping the complete logical flow intact.

Return a JSON object containing:
- 'optimizedPrompt': String (markdown)
- 'summary': String (markdown)
- 'compactedContext': String (markdown)

Here is the exact transcript:
--------------------
${formattedTranscript}
--------------------
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedPrompt: { type: Type.STRING, description: "A beautifully formatted prompt ready to be pasted directly into another AI" },
            summary: { type: Type.STRING, description: "Core details, key findings, active decisions and next actions" },
            compactedContext: { type: Type.STRING, description: "Boilerplate-free condensed version of the chat history to fit inside token limits" }
          },
          required: ["optimizedPrompt", "summary", "compactedContext"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini analyst.");
    }

    const parsed = JSON.parse(resultText);
    res.json({ success: true, ...parsed });

  } catch (error: any) {
    console.error("Error in /api/generate-context:", error);
    res.status(500).json({ error: error.message || "Failed to generate context" });
  }
});

// Ask Gemini about the imported chat context
app.post("/api/ask-context", async (req, res) => {
  try {
    const { messages, question, sourcePlatform, title } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided." });
    }
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "No question provided." });
    }

    const formattedTranscript = messages.map(m => {
      const label = m.role === 'user' ? 'HUMAN / USER' : 'AI ASSISTANT';
      return `[${label}]:\n${m.text}\n--------------------`;
    }).join('\n\n');

    const prompt = `
You are an expert AI Analyst and Consultant.
You are given a full transcript of a conversation between a human user and an AI assistant on the platform "${sourcePlatform || 'AI Studio'}".
The conversation is titled: "${title || 'Imported Chat'}".

Your goal is to thoroughly analyze this context and answer the user's specific question: "${question}".
Provide a highly professional, structured, detailed, and insightful response. Use markdown, code highlights, bold text, and bullet points where helpful.

Here is the full transcript:
--------------------
${formattedTranscript}
--------------------

Now, please answer the user's question: "${question}"
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ success: true, answer: response.text });

  } catch (error: any) {
    console.error("Error in /api/ask-context:", error);
    res.status(500).json({ error: error.message || "Failed to query context" });
  }
});

// Setup Express and Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

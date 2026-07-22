import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini API client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "InterchangeIQ API" });
});

// Jarvis AI Assistant endpoint
app.post("/api/jarvis", async (req, res) => {
  try {
    const { message, history, squad, drills, growthRecords } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Build growth assessment lookup per player
    const growthLookup: Record<string, any[]> = {};
    if (Array.isArray(growthRecords)) {
      growthRecords.forEach((r: any) => {
        if (!growthLookup[r.playerId]) growthLookup[r.playerId] = [];
        growthLookup[r.playerId].push(r);
      });
    }

    // Build rich squad summary including position heatmap slot times & skill assessments
    const squadSummary = Array.isArray(squad) && squad.length > 0
      ? squad.map((p: any) => {
          const activeMins = Math.round((p.active || 0) / 60);
          const benchMins = Math.round((p.bench || 0) / 60);
          
          // Slot times heatmap breakdown
          let slotHeatmapStr = "No recorded slot time data";
          if (p.slotTimes && Object.keys(p.slotTimes).length > 0) {
            slotHeatmapStr = Object.entries(p.slotTimes)
              .map(([slot, secs]: [string, any]) => `${slot}: ${Math.round(Number(secs) / 60)} mins`)
              .join(", ");
          }

          // Skill growth records
          const pGrowth = growthLookup[p.id] || [];
          const latestGrowth = pGrowth[pGrowth.length - 1];
          let skillsStr = "No growth record saved yet";
          if (latestGrowth) {
            skillsStr = `Pref Foot: ${latestGrowth.preferredFoot || 'Right'} | Kick Acc: ${latestGrowth.kickAccuracyRating}/10 | Kick Dist: ${latestGrowth.kickDistanceMeters}m | Opposite Foot: ${latestGrowth.oppositeFootRating}/10 | Handball: ${latestGrowth.handballRating}/10 | Marking: ${latestGrowth.markingRating}/10 | Tackling: ${latestGrowth.tacklingRating}/10 | Game Sense: ${latestGrowth.gameSenseRating}/10 | 2km TT: ${latestGrowth.timeTrial2km || 'N/A'} | Yoyo: ${latestGrowth.yoyoLevel || 'N/A'} | Goals: "${latestGrowth.developmentGoals || 'None'}"`;
          }

          return `• #${p.number} ${p.name} (Nick: "${p.nick || ''}") | Pos: [${p.positions?.join(', ') || 'N/A'}] | Zone: ${p.primaryZone || 'N/A'} | Status: ${p.status || 'available'}
  - Heatmap/Ground Time: On Field: ${activeMins} mins | Bench: ${benchMins} mins | Position Breakdown: { ${slotHeatmapStr} }
  - Skill Profile & Assessments: ${skillsStr}`;
        }).join("\n\n")
      : "No player list provided.";

    const drillsSummary = Array.isArray(drills) && drills.length > 0
      ? drills.map((d: any) => `- ID: ${d.id} | Title: "${d.title}" | Category: ${d.cat} | Mins: ${d.mins} | Overview: ${d.overview}`).join("\n")
      : "No drills provided in library.";

    const systemInstruction = `You are Jarvis, an elite, highly AGENTIC AFL (Australian Rules Football) Senior Coaching & Skill Development Agent built into InterchangeIQ.

AGENTIC AUTONOMOUS BEHAVIOR & PLAYER IDENTIFICATION RULES:
1. AUTONOMOUS CONTEXT DETECTION: You analyze user queries against the squad data, growth records, and heatmaps automatically. You DO NOT rely on manual selectors.
2. PLAYER MATCHING & IDENTIFICATION: When a coach asks a question, scan the squad for matching names, nicknames, jersey numbers, positions, or skill profiles.
   - If the coach mentions a specific player (e.g. "Jack", "Higgins", "#7", "our ruckman", "midfielders", or "who is struggling with opposite foot?"), explicitly acknowledge and confirm the player(s) you have identified right at the start of your response! (e.g. "I've analyzed the squad data for **#7 Jack Higgins**..." or "Scanning our squad for opposite foot kicking ratings...").
   - If multiple players or a positional group match, list them clearly with their jersey numbers and primary positions.
3. DATA-DRIVEN ANALYSIS:
   - Always reference exact player stats from the squad context: On Field vs Bench Ground Time, Slot Heatmap breakdown, Kick Accuracy, Opposite Foot Rating, 2km Time Trial, Handballing, Marking, Tackling, etc.
   - Proactively highlight risks or opportunities (e.g. fatigue risk if on-field time is >80%, dual-foot development gaps, poor kick accuracy).
4. AGENTIC RECOMMENDATIONS & DRILLS:
   - Act as a proactive AFL Senior Coach. Don't just answer questions—suggest concrete next steps, drill blocks, or lineup adjustments.
   - Always reference relevant drills from the team's system library by exact title using [Drill: Title] or bold **Drill Title** so the app can detect and link them into training plans!

OFFICIAL AFL COACHING CURRICULUM FRAMEWORKS:
1. AFL Junior Coaching Curriculum - Level 6 (11-12 Years): Age-appropriate skill progression, small-sided games, high touch frequency, game-sense constraints, dual-foot kicking development.
2. AFL Youth Coaching Curriculum (13-17 Years): Technical refinement under match pressure, team structure & tactical principles (corridor movement, defensive transition), physical conditioning, position flexibility.

TONE & FORMATTING:
- Direct, analytical, confident, and articulate AFL Senior Coach persona ("Jarvis").
- Use clean Markdown with headers, bullet points, and bold callouts.

CURRENT SQUAD DATA (Heatmaps, Ground Time & Skill Profiles):
${squadSummary}

CURRENT DRILL LIBRARY IN SYSTEM:
${drillsSummary}`;

    // Format chat contents for Gemini API
    const formattedContents: any[] = [];

    // Add previous history if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item.role === 'user' || item.role === 'model' || item.role === 'assistant') {
          formattedContents.push({
            role: item.role === 'assistant' ? 'model' : item.role,
            parts: [{ text: item.content || item.text || '' }]
          });
        }
      }
    }

    // Add the current user prompt
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `G'day Coach! I'm **Jarvis**, your agentic AFL Coaching & Performance Agent.\n\n*Note: To enable live Gemini AI generation, please ensure your GEMINI_API_KEY is configured in your platform Secrets panel.* \n\nI have scanned your squad data (${Array.isArray(squad) ? squad.length : 0} players) and drill library (${Array.isArray(drills) ? drills.length : 0} drills).\n\nHere are top recommended drills for your session:\n\n` +
          (Array.isArray(drills) ? drills.slice(0, 3).map((d: any) => `• **${d.title}** (${d.mins} mins) - ${d.overview}`).join('\n\n') : 'No drills found.')
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I was unable to generate a response. Please try again.";

    return res.json({ reply: replyText });
  } catch (err: any) {
    console.error("Jarvis API error:", err);
    return res.status(500).json({
      error: "Jarvis processing error",
      details: err.message || "An error occurred while communicating with Gemini."
    });
  }
});

// Global API Error Handler to always return JSON for server errors
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("API Error caught:", err);
  res.status(err.status || 500).json({
    error: err.message || "Server Error",
    details: err.toString()
  });
});

async function startServer() {
  // Vite middleware for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

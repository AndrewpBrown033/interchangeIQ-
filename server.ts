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
    const { message, history, squad, drills, focusArea, targetPlayers, duration, growthRecords } = req.body;

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

    const systemInstruction = `You are Jarvis, an elite AFL (Australian Rules Football) Senior Coaching & Skill Development Assistant built into InterchangeIQ.
Your role is to assist coaches in open conversation on EVERYTHING regarding:
1. Individual Players & Squad Performance (Skill levels, kick accuracy, opposite foot ratings, 2km time trial times, game sense, tackling, marking, handballing).
2. Position Heatmaps & Ground Time Distribution (Time recorded in specific field slots like Full Forward, Centre, Wing, Half Back, Ruck, Bench, etc., on-field vs bench percentages, rotation optimization).
3. AFL Training Plans & Drill Recommendations (Aligning session objectives with the team's drill library).
4. Match Strategy, Kick-In Traps, Stoppages & Official AFL Junior/Youth Curriculums.

OFFICIAL AFL COACHING CURRICULUM FRAMEWORKS:
1. AFL Junior Coaching Curriculum - Level 6 (11-12 Years) Guidebook:
   - Key Principles: Age-appropriate skill progression, small-sided games (SSGs), high touch frequency, game-sense constraints, dual-foot kicking development, dynamic footy prep warm-ups, positive feedback, and fun/engagement.
2. AFL Youth Coaching Curriculum (13-17 Years):
   - Key Principles: Technical refinement under match pressure, team structure & tactical principles (corridor movement, defensive transition), physical conditioning, position flexibility, player decision-making, and self-reflection.

IMPORTANT INSTRUCTIONS:
1. Maintain a friendly, highly articulate, expert AFL Senior Coach persona ("Jarvis").
2. Answer questions in an open, direct, analytical, and conversational manner.
3. When answering questions about a player or group of players:
   - Provide explicit stats from their Positional Heatmap / Ground Time breakdown (e.g., active mins on field vs bench mins, time spent at specific field slots).
   - Reference their exact Skill Assessment scores (e.g. Kick Accuracy, Opposite Foot Rating, 2km Time Trial, Handballing, Marking, Tackling, Coach Notes).
4. Always suggest actionable coaching takeaways or drills from the team's system drill library whenever appropriate.
5. When referencing a drill from the library, clearly mention its EXACT title (e.g., [Drill: Title]) so the system can match and link it.
6. Format your responses with clean Markdown headers, bullet points, and bold text for maximum readability.

CURRENT SQUAD (Heatmap, Time Recorded in Positions & Skill Profiles):
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

    // Add the current prompt
    let userPrompt = message;
    if (focusArea || targetPlayers) {
      userPrompt += `\n\n[Context - Area of Focus: ${focusArea || 'General'}, Target Players/Group: ${targetPlayers || 'All Squad'}, Target Duration: ${duration || '45 mins'}]`;
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
      // Provide a helpful fallback response if key is missing in dev environment
      return res.json({
        reply: `Hello Coach! I'm **Jarvis**, your AFL Coaching Assistant.\n\n*Note: To enable live Gemini AI generation, please ensure your GEMINI_API_KEY is configured in your platform Secrets panel.* \n\nBased on your drill library, here are recommended drills for **${focusArea || 'Skill Development'}**:\n\n` +
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

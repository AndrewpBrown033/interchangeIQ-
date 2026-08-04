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

// Lazy initializer for Gemini API client to prevent startup errors if key is empty
function getGemAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "InterchangeIQ API" });
});

// Jarvis AI Assistant endpoint (uses Gemini Flash)
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

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `G'day Coach! I'm **Jarvis**, your agentic AFL Coaching & Performance Agent.\n\n*Note: GEMINI_API_KEY is currently not configured in your environment.* \n\nI have scanned your squad data (${Array.isArray(squad) ? squad.length : 0} players) and drill library (${Array.isArray(drills) ? drills.length : 0} drills).\n\nHere are top recommended drills for your session:\n\n` +
          (Array.isArray(drills) ? drills.slice(0, 3).map((d: any) => `• **${d.title}** (${d.mins} mins) - ${d.overview}`).join('\n\n') : 'No drills found.')
      });
    }

    const ai = getGemAIClient();
    const geminiContents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item.role === 'user' || item.role === 'model' || item.role === 'assistant') {
          geminiContents.push({
            role: item.role === 'assistant' ? 'model' : item.role,
            parts: [{ text: item.content || item.text || '' }]
          });
        }
      }
    }
    geminiContents.push({ role: 'user', parts: [{ text: message }] });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: geminiContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = geminiResponse.text || "I was unable to generate a response. Please try again.";
    return res.json({ reply: replyText, provider: "gemini" });
  } catch (err: any) {
    console.error("Jarvis API error:", err);
    return res.status(500).json({
      error: "Jarvis processing error",
      details: err.message || "An error occurred while communicating with Gemini."
    });
  }
});

// Send invitation email endpoint
app.post("/api/send-invite", async (req, res) => {
  try {
    const { toEmail, toName, inviterName, role, inviteLink, teamName } = req.body;

    if (!toEmail || !inviteLink) {
      return res.status(400).json({ error: "toEmail and inviteLink are required." });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "InterchangeIQ <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      // No email provider configured - tell the caller explicitly so the UI
      // can fall back to "copy link" instead of silently pretending to succeed.
      return res.status(503).json({
        error: "Email provider not configured",
        details: "RESEND_API_KEY is not set on the server. Use the Copy Invite Link fallback for now.",
      });
    }

    const subject = `You're invited to join InterchangeIQ${teamName ? ` — ${teamName}` : ""}`;
    const html = `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#0f172a;">You've been invited to InterchangeIQ</h2>
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          Hi ${toName || "there"},<br/><br/>
          ${inviterName || "An administrator"} has invited you to join
          ${teamName ? `<b>${teamName}</b>` : "InterchangeIQ"} as a <b>${role || "Coach"}</b>.
        </p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="${inviteLink}"
             style="background:#2563eb; color:#fff; text-decoration:none; padding:12px 24px; border-radius:10px; font-weight:700; font-size:14px;">
            Accept Invitation
          </a>
        </p>
        <p style="color:#94a3b8; font-size:12px; line-height:1.5;">
          Or copy this link into your browser:<br/>
          <a href="${inviteLink}" style="color:#2563eb;">${inviteLink}</a>
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errBody);
      return res.status(502).json({
        error: "Failed to send invite email",
        details: errBody,
      });
    }

    const data = await resendRes.json();
    return res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error("Send invite error:", err);
    return res.status(500).json({
      error: "Send invite processing error",
      details: err.message || "An error occurred while sending the invitation email.",
    });
  }
});

// AI-powered drill import: converts raw pasted drill notes into a structured Drill object
app.post("/api/import-drill", async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || !String(rawText).trim()) {
      return res.status(400).json({ error: "rawText is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI import not configured",
        details: "GEMINI_API_KEY is not set on the server. Fill in the drill fields manually instead.",
      });
    }

    const systemInstruction = `You convert raw AFL (Australian Rules Football) training drill notes into a single structured JSON object for a coaching app's drill library.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "title": string,
  "cat": string,
  "mins": number,
  "players": string,
  "overview": string,
  "steps": [[string, string], ...]
}

Field guidance:
- "cat" is one short category such as "Kicking", "Handball", "Marking", "Contested Ball", "Decision Making", "Game Sense", "Strategy", or "Fitness" - pick whichever best matches the drill's main objective.
- "mins" is a realistic duration in minutes for one block of this drill.
- "players" is a short description of the players/group size needed, e.g. "Pairs", "8+", "Groups of 4".
- "overview" is a 1-3 sentence summary of what the drill develops.
- "steps" is an ordered list of [short step title, full step instruction] pairs, in the order the drill is actually run.

Rules:
- Base every field ONLY on the provided notes - do not invent details that aren't implied by the text.
- Fold any "coaching points", "coaching cues", or "progressions" sections into the relevant step's instruction text, or into the overview - do not add new JSON fields for them.
- Keep step titles short (2-4 words). Keep step instructions concise but complete.
- If the notes describe multiple drills, extract only the FIRST one.
- Return ONLY the JSON object - no markdown code fences, no preamble, no explanation.`;

    const ai = getGemAIClient();
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: String(rawText) }] }],
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const raw = geminiResponse.text || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Import drill JSON parse error:", parseErr, cleaned);
      return res.status(502).json({
        error: "Could not parse AI response",
        details: "The AI did not return valid JSON. Try again, or simplify the pasted text.",
      });
    }

    if (!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(502).json({
        error: "Incomplete drill extracted",
        details: "The AI response was missing a title or steps. Try again with more complete notes.",
      });
    }

    return res.json({ drill: parsed, provider: "gemini" });
  } catch (err: any) {
    console.error("Import drill error:", err);
    return res.status(500).json({
      error: "Import drill processing error",
      details: err.message || "An error occurred while extracting the drill.",
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

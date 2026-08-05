import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini API client on the server side (still used by /api/import-drill)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Initialize Claude API client on the server side (used by /api/jarvis)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// SMTP transport for outbound invite emails (Gmail/Office365, your own mail
// server, or an SMTP relay from SendGrid/Mailgun/Postmark/etc all work here).
// Built lazily and cached so a bad config surfaces as a clear send error
// rather than crashing the server on boot.
let smtpTransporter: nodemailer.Transporter | null = null;
let smtpTransporterKey = "";

function getSmtpTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const key = `${host}:${port}:${secure}:${user}`;

  if (!smtpTransporter || smtpTransporterKey !== key) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for port 465 (implicit TLS), false for 587/25 (STARTTLS)
      auth: { user, pass },
    });
    smtpTransporterKey = key;
  }
  return smtpTransporter;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "InterchangeIQ API" });
});

// Jarvis AI Assistant endpoint
app.post("/api/jarvis", async (req, res) => {
  try {
    const { message, history, squad, drills, growthRecords, apiKeyOverride } = req.body;
    const provider: "claude" | "gemini" = req.body.provider === "gemini" ? "gemini" : "claude";

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

    // Check if a usable API key exists for the selected provider (env var OR an
    // admin-entered override from Admin > Jarvis Settings > API Keys)
    const effectiveKey = provider === "gemini"
      ? (apiKeyOverride || process.env.GEMINI_API_KEY)
      : (apiKeyOverride || process.env.ANTHROPIC_API_KEY);

    if (!effectiveKey) {
      const missingKeyName = provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
      const providerLabel = provider === "gemini" ? "Gemini" : "Claude";
      return res.json({
        reply: `G'day Coach! I'm **Jarvis**, your agentic AFL Coaching & Performance Agent.\n\n*Note: To enable live ${providerLabel} AI generation, please add a ${providerLabel} API key in Admin > Jarvis Settings > API Keys, or set ${missingKeyName} in your platform Secrets panel.* \n\nI have scanned your squad data (${Array.isArray(squad) ? squad.length : 0} players) and drill library (${Array.isArray(drills) ? drills.length : 0} drills).\n\nHere are top recommended drills for your session:\n\n` +
          (Array.isArray(drills) ? drills.slice(0, 3).map((d: any) => `• **${d.title}** (${d.mins} mins) - ${d.overview}`).join('\n\n') : 'No drills found.')
      });
    }

    let replyText: string;

    if (provider === "gemini") {
      // Format chat contents for the Gemini API
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

      // Use a one-off client with the admin-entered key if one was supplied,
      // otherwise fall back to the shared server-configured client.
      const geminiClient = apiKeyOverride
        ? new GoogleGenAI({ apiKey: apiKeyOverride, httpOptions: { headers: { "User-Agent": "aistudio-build" } } })
        : ai;

      const geminiResponse = await geminiClient.models.generateContent({
        model: "gemini-3.6-flash",
        contents: geminiContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      replyText = geminiResponse.text || "I was unable to generate a response. Please try again.";
    } else {
      // Format chat contents for the Claude Messages API
      const claudeContents: { role: 'user' | 'assistant'; content: string }[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          if (item.role === 'user' || item.role === 'model' || item.role === 'assistant') {
            claudeContents.push({
              role: item.role === 'user' ? 'user' : 'assistant',
              content: item.content || item.text || ''
            });
          }
        }
      }
      claudeContents.push({ role: 'user', content: message });

      // Use a one-off client with the admin-entered key if one was supplied,
      // otherwise fall back to the shared server-configured client.
      const claudeClient = apiKeyOverride ? new Anthropic({ apiKey: apiKeyOverride }) : anthropic;

      const claudeResponse = await claudeClient.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system: systemInstruction,
        temperature: 0.7,
        messages: claudeContents,
      });

      replyText = claudeResponse.content
        .map((block: any) => (block.type === 'text' ? block.text : ''))
        .join('\n')
        .trim()
        || "I was unable to generate a response. Please try again.";
    }

    return res.json({ reply: replyText, provider });
  } catch (err: any) {
    console.error("Jarvis API error:", err);
    return res.status(500).json({
      error: "Jarvis processing error",
      details: err.message || "An error occurred while communicating with the AI provider."
    });
  }
});

// Send invitation email endpoint
app.post("/api/send-invite", async (req, res) => {
  try {
    const { toEmail, toName, inviterName, role, inviteLink, teamName, smtpOverride } = req.body;

    if (!toEmail || !inviteLink) {
      return res.status(400).json({ error: "toEmail and inviteLink are required." });
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
    // Plain-text alternative — some mail clients/security gateways render only this
    // part, or strip anchor tags from the HTML part entirely. Without this, the
    // activation link can silently disappear even though the send "succeeds".
    const text =
      `You've been invited to InterchangeIQ${teamName ? ` (${teamName})` : ""}\n\n` +
      `Hi ${toName || "there"},\n\n` +
      `${inviterName || "An administrator"} has invited you to join ${teamName || "InterchangeIQ"} as a ${role || "Coach"}.\n\n` +
      `Accept your invitation here:\n${inviteLink}\n`;

    // 1. Prefer SMTP credentials entered in Admin > Notification Settings for this
    //    request, so admins don't have to edit the server's .env file directly.
    if (smtpOverride?.host && smtpOverride?.user && smtpOverride?.pass) {
      try {
        const port = Number(smtpOverride.port) || 587;
        const overrideTransporter = nodemailer.createTransport({
          host: smtpOverride.host,
          port,
          secure: !!smtpOverride.secure || port === 465,
          auth: { user: smtpOverride.user, pass: smtpOverride.pass },
        });
        const info = await overrideTransporter.sendMail({
          from: smtpOverride.from || smtpOverride.user,
          to: toEmail,
          subject,
          html,
          text,
        });
        return res.json({ success: true, id: info.messageId, transport: "smtp-override" });
      } catch (smtpErr: any) {
        console.error("SMTP override send error:", smtpErr);
        return res.status(502).json({
          error: "Failed to send invite email via SMTP",
          details: smtpErr.message || "SMTP send failed. Check the SMTP settings in Admin > Notification Settings.",
        });
      }
    }

    // 2. Fall back to a direct SMTP relay configured on the server itself via
    //    SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS env vars.
    const smtpTransporter = getSmtpTransporter();
    if (smtpTransporter) {
      const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "";
      try {
        const info = await smtpTransporter.sendMail({
          from: SMTP_FROM,
          to: toEmail,
          subject,
          html,
          text,
        });
        return res.json({ success: true, id: info.messageId, transport: "smtp" });
      } catch (smtpErr: any) {
        console.error("SMTP send error:", smtpErr);
        return res.status(502).json({
          error: "Failed to send invite email via SMTP",
          details: smtpErr.message || "SMTP send failed. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
        });
      }
    }

    // 3. Fall back to the Resend HTTP API if neither is configured.
    const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "InterchangeIQ <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      // Nothing configured — tell the caller explicitly so the UI
      // can fall back to "copy link" instead of silently pretending to succeed.
      return res.status(503).json({
        error: "Email provider not configured",
        details: "Set SMTP details in Admin > Notification Settings (recommended), SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS on the server, or RESEND_API_KEY as an alternative. Use the Copy Invite Link fallback for now.",
      });
    }

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
        text,
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
    return res.json({ success: true, id: data.id, transport: "resend" });
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
    const { rawText, apiKeyOverride } = req.body;
    const provider: "claude" | "gemini" = req.body.provider === "gemini" ? "gemini" : "claude";

    if (!rawText || !String(rawText).trim()) {
      return res.status(400).json({ error: "rawText is required." });
    }

    const effectiveKey = provider === "gemini"
      ? (apiKeyOverride || process.env.GEMINI_API_KEY)
      : (apiKeyOverride || process.env.ANTHROPIC_API_KEY);

    if (!effectiveKey) {
      const missingKeyName = provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
      return res.status(503).json({
        error: "AI import not configured",
        details: `${missingKeyName} is not set on the server. Add a key in Admin > Jarvis Settings > API Keys, fill in the drill fields manually, or switch providers.`,
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

    let raw = "";

    if (provider === "gemini") {
      const geminiClient = apiKeyOverride
        ? new GoogleGenAI({ apiKey: apiKeyOverride, httpOptions: { headers: { "User-Agent": "aistudio-build" } } })
        : ai;

      const geminiResponse = await geminiClient.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ role: "user", parts: [{ text: String(rawText) }] }],
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });
      raw = geminiResponse.text || "";
    } else {
      const claudeClient = apiKeyOverride ? new Anthropic({ apiKey: apiKeyOverride }) : anthropic;

      const claudeResponse = await claudeClient.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemInstruction,
        temperature: 0.3,
        messages: [{ role: "user", content: String(rawText) }],
      });
      raw = claudeResponse.content
        .map((block: any) => (block.type === 'text' ? block.text : ''))
        .join('\n');
    }

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

    return res.json({ drill: parsed, provider });
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

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// Shared Express API app.
//
// This is the SINGLE SOURCE OF TRUTH for all /api/* route handlers
// (jarvis, send-invite, send-password-reset, test-smtp, import-drill, health).
//
// It is used by TWO different entry points:
//   1. Local dev: root-level `server.ts` imports `app` from here, adds Vite's
//      dev middleware / static file serving on top, and calls app.listen().
//   2. Production: `functions/src/index.ts` imports `app` from here and wraps
//      it as a Firebase Cloud Function (onRequest), so it can actually run
//      once deployed — Firebase Hosting alone cannot execute this Express
//      server, it only serves static files.
//
// Do not duplicate route logic elsewhere — edit routes here only.
const express_1 = __importDefault(require("express"));
const genai_1 = require("@google/genai");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin = __importStar(require("firebase-admin"));
dotenv_1.default.config();
if (!admin.apps.length) {
    // In the deployed Cloud Function this picks up the function's own service
    // account automatically. In local dev (server.ts) there may be no
    // credentials available at all — that's fine, we only touch admin.auth()
    // inside try/catch in the routes below, and local dev can fall back to
    // the SMTP/Resend/MailerSend transports without it.
    try {
        admin.initializeApp();
    }
    catch (e) {
        console.warn("firebase-admin initializeApp skipped:", e?.message || e);
    }
}
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Initialize Gemini API client on the server side (still used by /api/import-drill)
const ai = new genai_1.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
        headers: {
            "User-Agent": "aistudio-build",
        },
    },
});
// Initialize Claude API client on the server side (used by /api/jarvis)
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
});
// SMTP transport for outbound invite emails (Gmail/Office365, your own mail
// server, or an SMTP relay from SendGrid/Mailgun/Postmark/etc all work here).
// Built lazily and cached so a bad config surfaces as a clear send error
// rather than crashing the server on boot.
let smtpTransporter = null;
let smtpTransporterKey = "";
function getSmtpTransporter() {
    const host = process.env.SMTP_HOST || "";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    if (!host || !user || !pass)
        return null;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const key = `${host}:${port}:${secure}:${user}`;
    if (!smtpTransporter || smtpTransporterKey !== key) {
        smtpTransporter = nodemailer_1.default.createTransport({
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
    const debugLogs = [];
    try {
        const { message, history, squad, drills, growthRecords, apiKeyOverride } = req.body;
        const provider = req.body.provider === "gemini" ? "gemini" : "claude";
        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }
        // Build growth assessment lookup per player
        const growthLookup = {};
        if (Array.isArray(growthRecords)) {
            growthRecords.forEach((r) => {
                if (!growthLookup[r.playerId])
                    growthLookup[r.playerId] = [];
                growthLookup[r.playerId].push(r);
            });
        }
        // Build rich squad summary including position heatmap slot times & skill assessments
        const squadSummary = Array.isArray(squad) && squad.length > 0
            ? squad.map((p) => {
                const activeMins = Math.round((p.active || 0) / 60);
                const benchMins = Math.round((p.bench || 0) / 60);
                // Slot times heatmap breakdown
                let slotHeatmapStr = "No recorded slot time data";
                if (p.slotTimes && Object.keys(p.slotTimes).length > 0) {
                    slotHeatmapStr = Object.entries(p.slotTimes)
                        .map(([slot, secs]) => `${slot}: ${Math.round(Number(secs) / 60)} mins`)
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
            ? drills.map((d) => `- ID: ${d.id} | Title: "${d.title}" | Category: ${d.cat} | Mins: ${d.mins} | Overview: ${d.overview}`).join("\n")
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
        // Build debug logs collector for Jarvis AI executions
        const logTrace = (msg) => {
            const ts = new Date().toISOString().slice(11, 23);
            const line = `[${ts}] ${msg}`;
            debugLogs.push(line);
            console.log(`[JARVIS TRACE] ${line}`);
        };
        logTrace(`Request received for Jarvis AI | Provider: ${provider.toUpperCase()}`);
        // Check if a usable API key exists for the selected provider (env var OR an
        // admin-entered override from Admin > Jarvis Settings > API Keys)
        const effectiveKey = provider === "gemini"
            ? (apiKeyOverride || process.env.GEMINI_API_KEY)
            : (apiKeyOverride || process.env.ANTHROPIC_API_KEY);
        const keySource = apiKeyOverride
            ? "Admin Override (Admin > Jarvis Settings)"
            : (provider === "gemini" ? "process.env.GEMINI_API_KEY" : "process.env.ANTHROPIC_API_KEY");
        const maskedKey = effectiveKey
            ? (effectiveKey.length > 10 ? `${effectiveKey.slice(0, 6)}...${effectiveKey.slice(-4)}` : "PRESENT")
            : "MISSING";
        logTrace(`API Key Source: ${keySource} | Status: ${maskedKey}`);
        logTrace(`Input Prompt (${message.length} chars): "${message.slice(0, 120)}${message.length > 120 ? '...' : ''}"`);
        logTrace(`History Context: ${Array.isArray(history) ? history.length : 0} prior turn(s)`);
        logTrace(`Squad Context: ${Array.isArray(squad) ? squad.length : 0} players | Drills: ${Array.isArray(drills) ? drills.length : 0} items | Growth: ${Array.isArray(growthRecords) ? growthRecords.length : 0} records`);
        logTrace(`System Prompt Size: ${systemInstruction.length} chars`);
        if (!effectiveKey) {
            const missingKeyName = provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
            const providerLabel = provider === "gemini" ? "Gemini" : "Claude";
            logTrace(`WARNING: No API key found for ${provider.toUpperCase()}. Returning fallback prompt notice.`);
            return res.json({
                reply: `G'day Coach! I'm **Jarvis**, your agentic AFL Coaching & Performance Agent.\n\n*Note: To enable live ${providerLabel} AI generation, please add a ${providerLabel} API key in Admin > Jarvis Settings > API Keys, or set ${missingKeyName} in your platform Secrets panel.* \n\nI have scanned your squad data (${Array.isArray(squad) ? squad.length : 0} players) and drill library (${Array.isArray(drills) ? drills.length : 0} drills).\n\nHere are top recommended drills for your session:\n\n` +
                    (Array.isArray(drills) ? drills.slice(0, 3).map((d) => `• **${d.title}** (${d.mins} mins) - ${d.overview}`).join('\n\n') : 'No drills found.'),
                provider,
                debugLogs,
            });
        }
        let replyText;
        if (provider === "gemini") {
            logTrace(`[Gemini] Initializing GoogleGenAI SDK with model: gemini-3.6-flash`);
            // Format chat contents for the Gemini API
            const geminiContents = [];
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
            logTrace(`[Gemini] Payload formatted with ${geminiContents.length} content turn(s). Calling Gemini API...`);
            // Use a one-off client with the admin-entered key if one was supplied,
            // otherwise fall back to the shared server-configured client.
            const geminiClient = apiKeyOverride
                ? new genai_1.GoogleGenAI({ apiKey: apiKeyOverride, httpOptions: { headers: { "User-Agent": "aistudio-build" } } })
                : ai;
            const geminiStart = Date.now();
            try {
                const geminiResponse = await geminiClient.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: geminiContents,
                    config: {
                        systemInstruction,
                        temperature: 0.7,
                    }
                });
                const elapsedMs = Date.now() - geminiStart;
                replyText = geminiResponse.text || "I was unable to generate a response. Please try again.";
                logTrace(`[Gemini SUCCESS] API call completed in ${elapsedMs}ms (${replyText.length} chars generated)`);
                logTrace(`[Gemini PREVIEW] "${replyText.slice(0, 140).replace(/\n/g, ' ')}${replyText.length > 140 ? '...' : ''}"`);
            }
            catch (geminiErr) {
                const elapsedMs = Date.now() - geminiStart;
                logTrace(`[Gemini ERROR] Call failed after ${elapsedMs}ms: ${geminiErr.message || String(geminiErr)}`);
                throw geminiErr;
            }
        }
        else {
            logTrace(`[Claude] Initializing Anthropic SDK with model: claude-sonnet-5`);
            // Format chat contents for the Claude Messages API
            const claudeContents = [];
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
            logTrace(`[Claude] Payload formatted with ${claudeContents.length} message turn(s). Calling Anthropic API...`);
            // Use a one-off client with the admin-entered key if one was supplied,
            // otherwise fall back to the shared server-configured client.
            const claudeClient = apiKeyOverride ? new sdk_1.default({ apiKey: apiKeyOverride }) : anthropic;
            const claudeStart = Date.now();
            try {
                const claudeResponse = await claudeClient.messages.create({
                    model: "claude-sonnet-5",
                    max_tokens: 2048,
                    system: systemInstruction,
                    temperature: 0.7,
                    messages: claudeContents,
                });
                const elapsedMs = Date.now() - claudeStart;
                replyText = claudeResponse.content
                    .map((block) => (block.type === 'text' ? block.text : ''))
                    .join('\n')
                    .trim()
                    || "I was unable to generate a response. Please try again.";
                const usageStr = claudeResponse.usage ? `Tokens: [Input: ${claudeResponse.usage.input_tokens}, Output: ${claudeResponse.usage.output_tokens}]` : '';
                logTrace(`[Claude SUCCESS] API call completed in ${elapsedMs}ms (${replyText.length} chars generated) | ${usageStr}`);
                logTrace(`[Claude PREVIEW] "${replyText.slice(0, 140).replace(/\n/g, ' ')}${replyText.length > 140 ? '...' : ''}"`);
            }
            catch (claudeErr) {
                const elapsedMs = Date.now() - claudeStart;
                logTrace(`[Claude ERROR] Call failed after ${elapsedMs}ms: ${claudeErr.message || String(claudeErr)}`);
                throw claudeErr;
            }
        }
        return res.json({ reply: replyText, provider, debugLogs });
    }
    catch (err) {
        console.error("Jarvis API error:", err);
        return res.status(500).json({
            error: "Jarvis processing error",
            details: err.message || "An error occurred while communicating with the AI provider.",
            debugLogs: typeof debugLogs !== 'undefined' ? [...debugLogs, `[FATAL EXCEPTION] ${err.message || String(err)}`] : [`[FATAL EXCEPTION] ${err.message || String(err)}`]
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
        const text = `You've been invited to InterchangeIQ${teamName ? ` (${teamName})` : ""}\n\n` +
            `Hi ${toName || "there"},\n\n` +
            `${inviterName || "An administrator"} has invited you to join ${teamName || "InterchangeIQ"} as a ${role || "Coach"}.\n\n` +
            `Accept your invitation here:\n${inviteLink}\n`;
        // 1. Prefer SMTP credentials entered in Admin > Notification Settings for this
        //    request, so admins don't have to edit the server's .env file directly.
        if (smtpOverride?.host && smtpOverride?.user && smtpOverride?.pass) {
            try {
                const port = Number(smtpOverride.port) || 587;
                const overrideTransporter = nodemailer_1.default.createTransport({
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
            }
            catch (smtpErr) {
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
            }
            catch (smtpErr) {
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
        const data = (await resendRes.json());
        return res.json({ success: true, id: data.id, transport: "resend" });
    }
    catch (err) {
        console.error("Send invite error:", err);
        return res.status(500).json({
            error: "Send invite processing error",
            details: err.message || "An error occurred while sending the invitation email.",
        });
    }
});
// Send password reset email endpoint
app.post("/api/send-password-reset", async (req, res) => {
    try {
        const { toEmail, toName, resetLink, smtpOverride } = req.body;
        if (!toEmail) {
            return res.status(400).json({ error: "toEmail is required." });
        }
        const subject = "Password Reset Request — InterchangeIQ";
        // Generate a REAL, working Firebase password-reset link via the Admin SDK.
        // This replaces the old placeholder link (just the app's own root URL with
        // a ?resetEmail= query param, which the app never actually read — so
        // clicking it just landed back on an ordinary login screen with no way to
        // set a new password). The Admin SDK also tells the truth about whether
        // the account exists: unlike the client-side sendPasswordResetEmail call
        // (which, with Firebase's "Email Enumeration Protection" enabled, always
        // resolves successfully even for emails with no account, to avoid leaking
        // which emails are registered), generatePasswordResetLink genuinely throws
        // auth/user-not-found when there's no matching account, so we can report
        // an honest error instead of a false "sent!" message.
        let linkToUse = resetLink || `${req.protocol}://${req.get("host") || "localhost:3000"}/`;
        try {
            linkToUse = await admin.auth().generatePasswordResetLink(toEmail);
        }
        catch (linkErr) {
            if (linkErr?.code === "auth/user-not-found") {
                return res.status(404).json({
                    error: "No account found for that email",
                    details: `There is no InterchangeIQ account registered with ${toEmail}. Double-check the email address, or ask an admin to invite this address first.`,
                });
            }
            console.warn("generatePasswordResetLink failed, falling back to placeholder link:", linkErr?.message || linkErr);
            // Fall through with the placeholder link rather than hard-failing —
            // e.g. local dev without Admin credentials configured.
        }
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color:#0f172a; margin: 0; font-size: 20px; font-weight: 800;">InterchangeIQ Password Reset</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Coaching & AFL Match Operations Platform</p>
        </div>
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          Hi ${toName || "Coach"},<br/><br/>
          An administrator has issued a password reset request for your InterchangeIQ account (<b>${toEmail}</b>).
        </p>
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          Click the button below to access your account or set your updated password:
        </p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${linkToUse}"
             style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:10px; font-weight:700; font-size:14px; display:inline-block;">
            Reset Password / Sign In
          </a>
        </p>
        <p style="color:#94a3b8; font-size:12px; line-height:1.5;">
          Or copy this link into your browser:<br/>
          <a href="${linkToUse}" style="color:#2563eb; word-break: break-all;">${linkToUse}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color:#94a3b8; font-size:11px; text-align: center; margin: 0;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `;
        const text = `InterchangeIQ Password Reset\n\n` +
            `Hi ${toName || "Coach"},\n\n` +
            `An administrator has issued a password reset request for your InterchangeIQ account (${toEmail}).\n\n` +
            `Reset your password or sign in here:\n${linkToUse}\n\n` +
            `If you did not request this, you can safely ignore this email.\n`;
        // 0. MailerSend API Key override entered in Admin > Notification Settings
        const msOverrideKey = smtpOverride?.mailerSendApiKey || (smtpOverride?.pass?.startsWith("mlsn.") ? smtpOverride?.pass : (smtpOverride?.user?.startsWith("mlsn.") ? smtpOverride?.user : undefined));
        if (msOverrideKey) {
            try {
                const msFromEmail = smtpOverride?.from || "info@interchangeiq.app";
                const msRes = await fetch("https://api.mailersend.com/v1/email", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${msOverrideKey}`,
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify({
                        from: { email: msFromEmail, name: "InterchangeIQ" },
                        to: [{ email: toEmail, name: toName || "Coach" }],
                        subject,
                        html,
                        text,
                    }),
                });
                if (msRes.ok) {
                    const msData = (await msRes.json().catch(() => ({})));
                    return res.json({ success: true, id: msData.id || "mailersend-ok", transport: "mailersend-api", resetLink: linkToUse });
                }
                else {
                    const msErrText = await msRes.text();
                    console.error("MailerSend API override error:", msRes.status, msErrText);
                }
            }
            catch (msErr) {
                console.error("MailerSend override exception:", msErr);
            }
        }
        // 1. Prefer SMTP credentials entered in Admin > Notification Settings
        if (smtpOverride?.host && smtpOverride?.user && smtpOverride?.pass) {
            try {
                const port = Number(smtpOverride.port) || 587;
                const overrideTransporter = nodemailer_1.default.createTransport({
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
            }
            catch (smtpErr) {
                console.error("SMTP override reset send error:", smtpErr);
                return res.status(502).json({
                    error: "Failed to send password reset email via SMTP",
                    details: smtpErr.message || "SMTP send failed. Check the settings in Admin > Notification Settings.",
                    resetLink: linkToUse,
                });
            }
        }
        // 2. Direct SMTP configured on server
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
                return res.json({ success: true, id: info.messageId, transport: "smtp", resetLink: linkToUse });
            }
            catch (smtpErr) {
                console.error("SMTP reset send error:", smtpErr);
                return res.status(502).json({
                    error: "Failed to send password reset email via SMTP",
                    details: smtpErr.message || "SMTP send failed. Check server SMTP credentials.",
                    resetLink: linkToUse,
                });
            }
        }
        // 3. MailerSend REST API
        const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY || process.env.MAILERSEND_API_TOKEN || "";
        if (MAILERSEND_API_KEY) {
            try {
                const msFromEmail = process.env.MAILERSEND_FROM_EMAIL || process.env.SMTP_FROM || "info@interchangeiq.app";
                const msRes = await fetch("https://api.mailersend.com/v1/email", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${MAILERSEND_API_KEY}`,
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify({
                        from: { email: msFromEmail, name: "InterchangeIQ" },
                        to: [{ email: toEmail, name: toName || "Coach" }],
                        subject,
                        html,
                        text,
                    }),
                });
                if (msRes.ok) {
                    const msData = (await msRes.json().catch(() => ({})));
                    return res.json({ success: true, id: msData.id || "mailersend-ok", transport: "mailersend", resetLink: linkToUse });
                }
                else {
                    const msErrText = await msRes.text();
                    console.error("MailerSend API error:", msRes.status, msErrText);
                }
            }
            catch (msErr) {
                console.error("MailerSend dispatch exception:", msErr);
            }
        }
        // 4. Resend HTTP API
        const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
        const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "InterchangeIQ <onboarding@resend.dev>";
        if (!RESEND_API_KEY && !MAILERSEND_API_KEY) {
            return res.status(503).json({
                error: "Email server (SMTP) not configured",
                details: "To deliver automatic emails directly to inboxes, enter your SMTP details in Admin > Notification Settings. In the meantime, use the direct reset link below.",
                resetLink: linkToUse,
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
            console.error("Resend API reset error:", resendRes.status, errBody);
            return res.status(502).json({
                error: "Failed to send password reset email via Resend",
                details: errBody,
                resetLink: linkToUse,
            });
        }
        const data = (await resendRes.json());
        return res.json({ success: true, id: data.id, transport: "resend", resetLink: linkToUse });
    }
    catch (err) {
        console.error("Send password reset error:", err);
        return res.status(500).json({
            error: "Send password reset processing error",
            details: err.message || "An error occurred while sending the password reset email.",
            resetLink: req.body?.resetLink || `${req.protocol}://${req.get("host") || "localhost:3000"}/`,
        });
    }
});
// Test SMTP connection endpoint with step-by-step debug diagnostics
app.post("/api/test-smtp", async (req, res) => {
    const debugLogs = [];
    const log = (msg) => {
        const entry = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
        debugLogs.push(entry);
        console.log(`[SMTP Debug] ${msg}`);
    };
    try {
        const { host, port, user, pass, from, testTo, mailerSendApiKey } = req.body;
        log(`Initiating SMTP / Email diagnostics...`);
        const cleanedUser = (user || "").trim();
        const cleanedPass = (pass || "").trim();
        const cleanedHost = (host || "").trim();
        const smtpPort = Number(port) || 587;
        // 1. Check if explicit MailerSend API Key or token (starts with mlsn.) is provided
        const explicitMsKey = (mailerSendApiKey || "").trim();
        const isMailerSendToken = explicitMsKey || cleanedPass.startsWith("mlsn.") || cleanedUser.startsWith("mlsn.");
        const tokenToUse = explicitMsKey || (cleanedPass.startsWith("mlsn.") ? cleanedPass : (cleanedUser.startsWith("mlsn.") ? cleanedUser : null));
        // Ensure target recipient email is a valid email address
        const rawTo = (testTo || req.body.userEmail || (cleanedUser.includes("@") && !cleanedUser.startsWith("mlsn.") ? cleanedUser : "")).trim();
        const targetAddress = rawTo.includes("@") ? rawTo : "coach@interchangeiq.app";
        log(`Target host: "${cleanedHost}", port: ${smtpPort}, user: "${cleanedUser}", target recipient: "${targetAddress}"`);
        if (isMailerSendToken && tokenToUse) {
            const maskedKey = tokenToUse.length > 10 ? `${tokenToUse.slice(0, 7)}...${tokenToUse.slice(-4)}` : "mlsn.****";
            log(`Detected MailerSend API key/token: ${maskedKey}.`);
            log(`Routing test via MailerSend REST API (HTTPS POST https://api.mailersend.com/v1/email)...`);
            const rawFrom = (from || (cleanedUser.includes("@") && !cleanedUser.startsWith("mlsn.") ? cleanedUser : "")).trim();
            const senderEmail = rawFrom.includes("@") ? rawFrom : "info@interchangeiq.app";
            log(`Configured Sender: "${senderEmail}" | Target Recipient: "${targetAddress}"`);
            const requestPayload = {
                from: { email: senderEmail, name: "InterchangeIQ Admin Test" },
                to: [{ email: targetAddress, name: "Admin" }],
                subject: "InterchangeIQ — MailerSend REST API Test",
                text: "MailerSend API integration verified! Emails can be delivered directly over HTTPS.",
                html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px; background: #f0fdf4;">
            <h3 style="color: #065f46; margin-top: 0;">MailerSend REST API Connected!</h3>
            <p style="color: #374151;">Your MailerSend API Token was verified over HTTPS port 443.</p>
            <p style="color: #6b7280; font-size: 12px;">Sent to ${targetAddress} via ${senderEmail}</p>
          </div>
        `,
            };
            log(`[API REQUEST] Headers: { "Authorization": "Bearer ${maskedKey}", "Content-Type": "application/json" }`);
            log(`[API REQUEST BODY] ${JSON.stringify({ from: requestPayload.from, to: requestPayload.to, subject: requestPayload.subject })}`);
            const msRes = await fetch("https://api.mailersend.com/v1/email", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenToUse}`,
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify(requestPayload),
            });
            log(`[API RESPONSE] HTTP Status: ${msRes.status} ${msRes.statusText}`);
            if (msRes.ok || msRes.status === 200 || msRes.status === 202) {
                const resText = await msRes.text().catch(() => "");
                log(`[API RESPONSE BODY] ${resText || "(Empty Success Response)"}`);
                log(`MailerSend REST API test succeeded! HTTP ${msRes.status}`);
                return res.json({
                    success: true,
                    transport: "mailersend-api",
                    messageId: "ms-api-verified",
                    recipient: targetAddress,
                    sender: senderEmail,
                    debugLogs,
                });
            }
            else {
                const msErrText = await msRes.text();
                log(`[API RESPONSE RAW BODY] ${msErrText}`);
                let msErrorSummary = msErrText;
                try {
                    const jsonErr = JSON.parse(msErrText);
                    if (jsonErr.message)
                        msErrorSummary = jsonErr.message;
                    if (jsonErr.errors) {
                        const fieldErrs = Object.entries(jsonErr.errors)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                            .join("; ");
                        msErrorSummary += ` (${fieldErrs})`;
                    }
                }
                catch (_) { }
                log(`MailerSend REST API returned error ${msRes.status}: ${msErrorSummary}`);
                let helpfulTip = msErrorSummary;
                if (msRes.status === 422) {
                    helpfulTip += `. MailerSend requires your 'From Email' (${senderEmail}) to belong to a domain verified in your MailerSend dashboard (e.g. info@yourdomain.com or MS_xxxx@trial-xxxx.mailersend.net).`;
                }
                else if (msRes.status === 401 || msRes.status === 403) {
                    helpfulTip += `. Please check that your MailerSend API Key is active and has 'Full Access' or 'Email' permissions.`;
                }
                return res.status(502).json({
                    error: `MailerSend API Error (${msRes.status})`,
                    details: helpfulTip,
                    debugLogs,
                });
            }
        }
        if (!cleanedHost || !cleanedUser) {
            log(`Error: Missing host or username in test request.`);
            return res.status(400).json({
                error: "Host and username are required to test SMTP settings.",
                debugLogs,
            });
        }
        // 2. Standard SMTP Transport Test with Nodemailer
        log(`Creating Nodemailer transport for ${cleanedHost}:${smtpPort} (implicit TLS: ${smtpPort === 465})...`);
        const transporter = nodemailer_1.default.createTransport({
            host: cleanedHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: cleanedUser, pass: cleanedPass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000,
            tls: {
                rejectUnauthorized: false, // Prevent self-signed cert blocking
            },
        });
        log(`[Step 1/2] Testing socket connection & authentication (transporter.verify)...`);
        await transporter.verify();
        log(`[Step 1/2] SMTP connection and credentials verified successfully!`);
        log(`[Step 2/2] Dispatching test email to ${targetAddress}...`);
        const info = await transporter.sendMail({
            from: from || cleanedUser,
            to: targetAddress,
            subject: "InterchangeIQ — SMTP Connection Test",
            text: "Congratulations! Your SMTP settings are correctly configured and ready to send emails for InterchangeIQ.",
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px; background: #f0fdf4;">
          <h3 style="color: #065f46; margin-top: 0;">SMTP Test Successful!</h3>
          <p style="color: #374151;">Your mail server credentials in <b>Admin > Notification Settings</b> are verified and working properly.</p>
        </div>
      `,
        });
        log(`Test email dispatched successfully! Message-ID: ${info.messageId}`);
        return res.json({
            success: true,
            transport: "smtp",
            messageId: info.messageId,
            recipient: targetAddress,
            debugLogs,
        });
    }
    catch (err) {
        log(`SMTP Test Exception: ${err.code || err.name || "Error"} - ${err.message}`);
        let helpfulAdvice = err.message || "Unable to connect or authenticate with the specified SMTP host.";
        if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.message?.includes("timeout")) {
            helpfulAdvice = `Connection to SMTP host timed out. Container/cloud sandboxes often block outbound TCP ports 587 and 465. TIP: If using MailerSend, paste your MailerSend API Key (starts with mlsn.) into the Password field, and InterchangeIQ will connect over HTTPS port 443 automatically.`;
        }
        else if (err.code === "EAUTH" || err.message?.includes("Invalid login") || err.message?.includes("535")) {
            helpfulAdvice = `Authentication failed. Check your SMTP Username and Password. For MailerSend, verify that your SMTP username is the MS_xxxx identifier from your MailerSend domain settings.`;
        }
        return res.status(502).json({
            error: "SMTP Connection Test Failed",
            details: helpfulAdvice,
            code: err.code || "ESMTP",
            debugLogs,
        });
    }
});
// AI-powered drill import: converts raw pasted drill notes into a structured Drill object
app.post("/api/import-drill", async (req, res) => {
    try {
        const { rawText, apiKeyOverride } = req.body;
        const provider = req.body.provider === "gemini" ? "gemini" : "claude";
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
                ? new genai_1.GoogleGenAI({ apiKey: apiKeyOverride, httpOptions: { headers: { "User-Agent": "aistudio-build" } } })
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
        }
        else {
            const claudeClient = apiKeyOverride ? new sdk_1.default({ apiKey: apiKeyOverride }) : anthropic;
            const claudeResponse = await claudeClient.messages.create({
                model: "claude-sonnet-5",
                max_tokens: 1024,
                system: systemInstruction,
                temperature: 0.3,
                messages: [{ role: "user", content: String(rawText) }],
            });
            raw = claudeResponse.content
                .map((block) => (block.type === 'text' ? block.text : ''))
                .join('\n');
        }
        const cleaned = raw.replace(/```json|```/g, "").trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        }
        catch (parseErr) {
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
    }
    catch (err) {
        console.error("Import drill error:", err);
        return res.status(500).json({
            error: "Import drill processing error",
            details: err.message || "An error occurred while extracting the drill.",
        });
    }
});
// Global API Error Handler to always return JSON for server errors
app.use((err, _req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    console.error("API Error caught:", err);
    res.status(err.status || 500).json({
        error: err.message || "Server Error",
        details: err.toString()
    });
});
//# sourceMappingURL=api-app.js.map
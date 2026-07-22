import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
    const { message, history, squad, drills, focusArea, targetPlayers, duration } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Build context summary for Jarvis
    const squadSummary = Array.isArray(squad) && squad.length > 0
      ? squad.map((p: any) => `- #${p.number} ${p.name} (${p.positions?.join(', ') || 'N/A'}) [Status: ${p.status || 'available'} ${p.note ? `Note: ${p.note}` : ''}]`).join("\n")
      : "No player list provided.";

    const drillsSummary = Array.isArray(drills) && drills.length > 0
      ? drills.map((d: any) => `- ID: ${d.id} | Title: "${d.title}" | Category: ${d.cat} | Mins: ${d.mins} | Overview: ${d.overview}`).join("\n")
      : "No drills provided in library.";

    const systemInstruction = `You are Jarvis, an elite AFL (Australian Rules Football) Senior Coaching & Skill Development Assistant built into InterchangeIQ.
Your role is to assist coaches with AFL training recommendations, player development, tactical session planning, and skill drills.

IMPORTANT INSTRUCTIONS:
1. Always maintain a professional, encouraging, articulate, and knowledgeable AFL coach persona ("Jarvis").
2. ALWAYS align recommendations to the drills available in the team's system library listed below wherever possible!
3. When referencing a drill from the library, clearly mention its EXACT title (e.g., [Drill: Title]) so the user can locate it in their system library.
4. When asked for a training plan, construct a structured, timed schedule (e.g. Warm-up, Skill Blocks, Match Simulation, Cool Down) using existing drills in the library where possible, noting drill duration in minutes.
5. Take into account any specified Focus Area (${focusArea || 'General'}), Target Players (${targetPlayers || 'All Squad'}), and Duration (${duration || '45 mins'}).
6. If the user asks about specific players or positional needs, tailor the drill suggestions directly to those players and positions.

CURRENT TEAM SQUAD:
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

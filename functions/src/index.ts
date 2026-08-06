import { onRequest } from "firebase-functions/v2/https";
import { app } from "./api-app";

// Deployed as the "api" Cloud Function. firebase.json rewrites
// /api/** on Hosting to this function, so requests like
// fetch('/api/jarvis') actually reach this Express app in production
// instead of falling through to Hosting's index.html catch-all.
//
// Configure secrets before deploying, e.g.:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
//   firebase functions:secrets:set GEMINI_API_KEY
//   firebase functions:secrets:set SMTP_HOST
//   firebase functions:secrets:set SMTP_USER
//   firebase functions:secrets:set SMTP_PASS
// then reference them below so the function is granted access at runtime.
export const api = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  app
);

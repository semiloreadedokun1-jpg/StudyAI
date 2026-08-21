const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 10000;

// ======================================================
// EDU NOVA AI
// Learn. Understand. Excel.
// ======================================================

const DAILY_MESSAGE_LIMIT = 10;

// Start with this model.
// The diagnostic endpoint will tell us if Google accepts it.
const MODEL = "gemini-2.5-flash";

// ======================================================
// GEMINI CLIENT
// ======================================================

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey
    })
  : null;

// ======================================================
// USAGE TRACKER
// ======================================================

const usage = new Map();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

// ======================================================
// HELPERS
// ======================================================

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getUserId(req) {
  return (
    req.body?.userId ||
    req.headers["x-user-id"] ||
    req.ip ||
    "anonymous"
  );
}

function getUsage(userId) {
  const today = getToday();

  let record = usage.get(userId);

  if (!record || record.date !== today) {
    record = {
      date: today,
      count: 0
    };

    usage.set(userId, record);
  }

  return record;
}

function safeError(error) {
  return {
    name: error?.name || "UnknownError",
    status: error?.status || null,
    message: error?.message || String(error),
    code: error?.code || null,
    statusText: error?.statusText || null
  };
}

// ======================================================
// GEMINI DIAGNOSTIC
// ======================================================

async function testGeminiConnection() {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from the Render environment variables."
    );
  }

  if (!ai) {
    throw new Error("Gemini client was not initialized.");
  }

  console.log("======================================");
  console.log("GEMINI CONNECTION TEST");
  console.log("Model:", MODEL);
  console.log("API key present: YES");
  console.log("API key length:", apiKey.length);
  console.log("======================================");

  try {
    const response = await ai.models.generateContent({
      model: MODEL,

      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Reply with exactly: EduNova AI connection successful."
            }
          ]
        }
      ],

      config: {
        temperature: 0,
        maxOutputTokens: 50
      }
    });

    const text = response?.text || "";

    console.log("GEMINI TEST SUCCESS");
    console.log("Model:", MODEL);
    console.log("Response:", text);

    return {
      success: true,
      model: MODEL,
      response: text.trim()
    };

  } catch (error) {
    console.error("======================================");
    console.error("GEMINI TEST FAILED");
    console.error("Model:", MODEL);
    console.error("Name:", error?.name);
    console.error("Status:", error?.status);
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Status text:", error?.statusText);
    console.error("Full error:", error);
    console.error("======================================");

    throw error;
  }
}

// ======================================================
// GENERATE EDU NOVA ANSWER
// ======================================================

async function generateAnswer(question) {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from the Render environment variables."
    );
  }

  if (!ai) {
    throw new Error("Gemini client was not initialized.");
  }

  console.log("======================================");
  console.log("NEW AI REQUEST");
  console.log("Model:", MODEL);
  console.log("Question:", question);
  console.log("======================================");

  try {
    const response = await ai.models.generateContent({
      model: MODEL,

      contents: [
        {
          role: "user",

          parts: [
            {
              text: `
You are EduNova AI.

Tagline:
"Learn. Understand. Excel."

You are a fast, friendly educational AI assistant.

Your main purpose is helping students understand school subjects.

Rules:

1. Explain concepts clearly and simply.
2. Use student-friendly language.
3. For mathematics and calculations, show the steps.
4. For difficult topics, start from the basics.
5. Give examples when useful.
6. Be accurate and honest.
7. Do not unnecessarily repeat the student's question.
8. Do not add related questions.
9. Do not add suggested questions.
10. Do not add unnecessary content underneath the answer.
11. Stay focused on the student's request.
12. For simple questions, answer directly.
13. For detailed questions, teach thoroughly.
14. For Economics, use correct economic terminology and explain it clearly.
15. Help the student understand rather than simply giving unexplained answers.

Student's question:

${question}
              `.trim()
            }
          ]
        }
      ],

      config: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    });

    const answer = response?.text;

    if (!answer || !answer.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    console.log("GEMINI ANSWER SUCCESS");
    console.log("Model:", MODEL);

    return answer.trim();

  } catch (error) {
    console.error("======================================");
    console.error("GEMINI ANSWER FAILED");
    console.error("Model:", MODEL);
    console.error("Name:", error?.name);
    console.error("Status:", error?.status);
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Status text:", error?.statusText);
    console.error("Full error:", error);
    console.error("======================================");

    throw error;
  }
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    app: "EduNova AI",
    tagline: "Learn. Understand. Excel.",
    model: MODEL,
    geminiKeyConfigured: Boolean(apiKey),
    dailyLimit: DAILY_MESSAGE_LIMIT
  });
});

// ======================================================
// GEMINI TEST ENDPOINT
// ======================================================

app.get("/api

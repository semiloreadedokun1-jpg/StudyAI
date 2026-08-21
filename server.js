const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 10000;
const DAILY_MESSAGE_LIMIT = 10;
const MODEL = "gemini-3.6-flash";

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

// Temporary in-memory usage tracker.
// This resets if Render restarts the server.
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

function getErrorDetails(error) {
  return {
    name: error?.name || "UnknownError",
    status: error?.status || null,
    code: error?.code || null,
    message: error?.message || String(error)
  };
}

// ======================================================
// GEMINI CHECK
// ======================================================

function checkGemini() {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing from Render environment variables."
    );
  }

  if (!ai) {
    throw new Error("Gemini client was not initialized.");
  }
}

// ======================================================
// GEMINI TEST
// ======================================================

async function testGeminiConnection() {
  checkGemini();

  console.log("======================================");
  console.log("GEMINI CONNECTION TEST");
  console.log("Model:", MODEL);
  console.log("API key configured: YES");
  console.log("======================================");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents:
      "Reply with exactly: EduNova AI connection successful.",
    config: {
      temperature: 0,
      maxOutputTokens: 50
    }
  });

  const text = response?.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  console.log("GEMINI TEST SUCCESS");
  console.log("Response:", text);

  return text;
}

// ======================================================
// GENERATE ANSWER
// ======================================================

async function generateAnswer(question) {
  checkGemini();

  const prompt = `
You are EduNova AI.

Tagline:
"Learn. Understand. Excel."

You are a fast, friendly educational AI assistant.

Your main purpose is helping students understand school subjects.

IMPORTANT RULES:

1. Explain concepts clearly and simply.
2. Use student-friendly language.
3. For mathematics and calculations, show the steps.
4. For difficult topics, start from the basics.
5. Give examples when useful.
6. Be accurate and honest.
7. Do not unnecessarily repeat the student's question.
8. Do not add suggested questions.
9. Do not add unrelated questions.
10. Do not add unnecessary content underneath the answer.
11. Stay focused on the student's request.
12. For simple questions, answer directly.
13. For detailed questions, teach thoroughly.
14. For Economics, use correct economic terminology.
15. Explain difficult terminology in simple language.
16. Help the student understand instead of giving unexplained answers.
17. Keep answers reasonably concise unless the student asks for detail.

Student's question:

${question}
`.trim();

  console.log("======================================");
  console.log("NEW AI REQUEST");
  console.log("Model:", MODEL);
  console.log("Question:", question);
  console.log("======================================");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 1200
    }
  });

  const answer = response?.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  console.log("GEMINI ANSWER SUCCESS");

  return answer;
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ======================================================
// HEALTH
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    app: "EduNova AI",
    tagline: "Learn. Understand. Excel.",
    model: MODEL,
    geminiKeyConfigured: Boolean(apiKey),
    dailyMessageLimit: DAILY_MESSAGE_LIMIT
  });
});

// ======================================================
// GEMINI DIAGNOSTIC
// ======================================================

app.get("/api/test-gemini", async (req, res) => {
  try {
    const result = await testGeminiConnection();

    res.json({
      success: true,
      app: "EduNova AI",
      model: MODEL,
      message: result
    });
  } catch (error) {
    const details = getErrorDetails(error);

    console.error("======================================");
    console.error("GEMINI TEST FAILED");
    console.error(details);
    console.error("======================================");

    res.status(500).json({
      success: false,
      app: "EduNova AI",
      model: MODEL,
      error: details
    });
  }
});

// ======================================================
// USAGE
// ======================================================

app.get("/api/usage", (req, res) => {
  const userId = getUserId(req);
  const record = getUsage(userId);

  res.json({
    success: true,
    used: record.count,
    limit: DAILY_MESSAGE_LIMIT,
    remaining: Math.max(
      0,
      DAILY_MESSAGE_LIMIT - record.count
    )
  });
});

// ======================================================
// CHAT
// ======================================================

app.post("/api/chat", async (req, res) => {
  const question =
    typeof req.body?.question === "string"
      ? req.body.question.trim()
      : "";

  const userId = getUserId(req);

  console.log("Question received:", question);

  if (!question) {
    return res.status(400).json({
      success: false,
      error: "Please enter a question."
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error:
        "EduNova AI is not configured correctly. GEMINI_API_KEY is missing."
    });
  }

  const record = getUsage(userId);

  // 10-message daily limit
  if (record.count >= DAILY_MESSAGE_LIMIT) {
    return res.status(429).json({
      success: false,
      limitReached: true,
      error:
        "You have reached your 10-message daily limit.",
      used: record.count,
      limit: DAILY_MESSAGE_LIMIT,
      remaining: 0
    });
  }

  try {
    const answer = await generateAnswer(question);

    // Count only successful responses.
    record.count += 1;

    res.json({
      success: true,

      // Main response
      answer: answer,

      // Compatibility fields
      response: answer,
      text: answer,

      model: MODEL,

      usage: {
        used: record.count,
        limit: DAILY_MESSAGE_LIMIT,
        remaining: Math.max(
          0,
          DAILY_MESSAGE_LIMIT - record.count
        )
      }
    });
  } catch (error) {
    const details = getErrorDetails(error);

    console.error("======================================");
    console.error("EDUNOVA AI ERROR");
    console.error(details);
    console.error("======================================");

    res.status(500).json({
      success: false,
      error:
        "The AI model is temporarily unavailable. Please try again."
    });
  }
});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found."
  });
});

// ======================================================
// SERVER ERROR
// ======================================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

// ======================================================
// START
// ======================================================

app.listen(PORT, () => {
  console.log("======================================");
  console.log("EduNova AI is running");
  console.log("Learn. Understand. Excel.");
  console.log("Port:", PORT);
  console.log("Gemini model:", MODEL);
  console.log(
    "Gemini key configured:",
    Boolean(apiKey)
  );
  console.log(
    "Daily message limit:",
    DAILY_MESSAGE_LIMIT
  );
  console.log("======================================");
});

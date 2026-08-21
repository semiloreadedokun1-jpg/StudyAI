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

// Use reliable Gemini models with fallback.
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Simple in-memory usage tracker.
// Resets when the Render service restarts.
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

function cleanAnswer(text) {
  if (!text) {
    return "I couldn't generate an answer right now. Please try again.";
  }

  return String(text).trim();
}

// ======================================================
// ERROR CLASSIFICATION
// ======================================================

function getGeminiErrorMessage(error) {
  const status = error?.status;
  const message = String(error?.message || "").toLowerCase();

  if (status === 404 || message.includes("not found")) {
    return "The AI model is temporarily unavailable. Please try again.";
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("api key") ||
    message.includes("permission")
  ) {
    return "EduNova AI is temporarily unavailable because the AI service needs configuration.";
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit")
  ) {
    return "EduNova AI is busy right now. Please try again in a moment.";
  }

  if (
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("deadline")
  ) {
    return "The AI took too long to respond. Please try again.";
  }

  return "EduNova AI couldn't generate a response right now. Please try again.";
}

// ======================================================
// GENERATE AI ANSWER
// ======================================================

async function generateAnswer(question) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.code = "NO_API_KEY";
    throw error;
  }

  let lastError = null;

  for (const model of MODELS) {
    const controller = new AbortController();

    // 45 seconds instead of 20.
    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      console.log(`Trying Gemini model: ${model}`);

      const response = await ai.models.generateContent({
        model,

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

RULES:

1. Explain concepts clearly and simply.
2. Use student-friendly language.
3. For mathematics and calculations, show the steps.
4. For difficult topics, start from the basics.
5. Give examples when useful.
6. Be accurate and honest.
7. Do not unnecessarily repeat the student's question.
8. Do not add "related questions", "you may also ask", or suggested questions underneath your answer.
9. Do not add unnecessary sections just to make the answer longer.
10. Stay focused on the student's request.
11. If the student asks a simple question, give a direct answer.
12. If the student asks for detailed teaching, explain thoroughly.
13. For Economics, use correct economic terminology and explain difficult terminology.
14. Help the student learn rather than simply giving unexplained answers.
15. Do not end your answer with suggested questions.
16. Do not create a "Related questions" section.
17. Keep answers natural and useful.
18. For calculations, show clear working and the final answer.
19. If the student appears confused, explain the topic another way.
20. Never claim to have done something you have not done.

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

      const answer = cleanAnswer(response?.text);

      if (answer) {
        console.log(`Answer generated using: ${model}`);

        return answer;
      }

      throw new Error("Gemini returned an empty response.");

    } catch (error) {
      lastError = error;

      console.error(
        `Gemini model ${model} failed:`,
        error?.status || error?.message || error
      );

      // If this was a timeout, try the next model.
      // If it was a model-not-found error, also try the next model.
      continue;

    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

// ======================================================
// COMMON CHAT HANDLER
// ======================================================

async function handleChat(req, res) {
  try {
    const question = req.body?.question?.trim();

    // ------------------------------
    // Validate question
    // ------------------------------

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question."
      });
    }

    console.log("Question received:", question);

    // ------------------------------
    // Identify user
    // ------------------------------

    const userId = getUserId(req);
    const userUsage = getUsage(userId);

    // ------------------------------
    // Daily free limit
    // ------------------------------

    if (userUsage.count >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({
        success: false,
        limitReached: true,
        error:
          "You've reached your 10 free messages for today. Come back tomorrow or upgrade to Premium."
      });
    }

    // ------------------------------
    // Generate answer
    // ------------------------------

    const answer = await generateAnswer(question);

    // Only count successful AI responses.
    userUsage.count += 1;

    const remaining = Math.max(
      DAILY_MESSAGE_LIMIT - userUsage.count,
      0
    );

    console.log(
      `AI response generated. Usage: ${userUsage.count}/${DAILY_MESSAGE_LIMIT}`
    );

    // ------------------------------
    // Send response
    // ------------------------------

    return res.json({
      success: true,
      answer,

      usage: {
        used: userUsage.count,
        limit: DAILY_MESSAGE_LIMIT,
        remaining
      }
    });

  } catch (error) {
    console.error("EduNova AI error:", error);

    // API key problem
    if (
      error?.code === "NO_API_KEY" ||
      error?.message?.includes("GEMINI_API_KEY")
    ) {
      return res.status(500).json({
        success: false,
        error:
          "EduNova AI is temporarily unavailable. The server AI configuration needs attention."
      });
    }

    // Gemini-specific error
    return res.status(502).json({
      success: false,
      error: getGeminiErrorMessage(error)
    });
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
    models: MODELS
  });
});

// ======================================================
// MAIN CHAT ENDPOINT
// ======================================================

app.post("/api/chat", handleChat);

// ======================================================
// BACKWARD COMPATIBILITY
// ======================================================

app.post("/api/ask", handleChat);

// ======================================================
// USAGE
// ======================================================

app.get("/api/usage", (req, res) => {
  const userId = getUserId(req);

  const userUsage = getUsage(userId);

  res.json({
    used: userUsage.count,
    limit: DAILY_MESSAGE_LIMIT,
    remaining: Math.max(
      DAILY_MESSAGE_LIMIT - userUsage.count,
      0
    )
  });
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
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    error: "Something went wrong on the server."
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `EduNova AI is running on port ${PORT}`
  );
});

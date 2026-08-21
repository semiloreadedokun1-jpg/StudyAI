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

// Gemini model
const MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Simple in-memory usage tracker.
// This resets whenever the Render service restarts.
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
// GENERATE AI ANSWER
// ======================================================

async function generateAnswer(question) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20000);

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

Follow these rules:

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
13. For Economics, use correct economic terminology and explain the meaning of the terminology.
14. Help the student learn rather than simply giving unexplained answers.

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

    return cleanAnswer(response.text);

  } finally {
    clearTimeout(timeout);
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
    model: MODEL
  });
});

// ======================================================
// CHAT API
// ======================================================
// IMPORTANT:
// Your index.html uses /api/ask
// ======================================================

app.post("/api/ask", async (req, res) => {
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
    // Daily limit
    // ------------------------------

    if (userUsage.count >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({
        success: false,
        limitReached: true,
        error:
          "You've reached your 10 free messages for today. Come back tomorrow or upgrade to Nexa Plus."
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

    if (error?.name === "AbortError") {
      return res.status(504).json({
        success: false,
        error:
          "The AI took too long to respond. Please try again."
      });
    }

    if (
      error?.message?.includes("API key") ||
      error?.message?.includes("GEMINI_API_KEY")
    ) {
      return res.status(500).json({
        success: false,
        error:
          "EduNova AI is not configured correctly on the server."
      });
    }

    return res.status(500).json({
      success: false,
      error:
        "I'm having trouble connecting right now. Please try again."
    });
  }
});

// ======================================================
// BACKWARD COMPATIBILITY
// ======================================================
// /api/chat will also work if you use it later.
// ======================================================

app.post("/api/chat", async (req, res) => {
  req.url = "/api/ask";

  // Reuse the same handler logic by forwarding internally.
  try {
    const question = req.body?.question?.trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question."
      });
    }

    const userId = getUserId(req);
    const userUsage = getUsage(userId);

    if (userUsage.count >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({
        success: false,
        limitReached: true,
        error:
          "You've reached your 10 free messages for today. Come back tomorrow or upgrade to Nexa Plus."
      });
    }

    const answer = await generateAnswer(question);

    userUsage.count += 1;

    return res.json({
      success: true,
      answer,
      usage: {
        used: userUsage.count,
        limit: DAILY_MESSAGE_LIMIT,
        remaining: Math.max(
          DAILY_MESSAGE_LIMIT - userUsage.count,
          0
        )
      }
    });

  } catch (error) {
    console.error("EduNova AI error:", error);

    return res.status(500).json({
      success: false,
      error:
        "I'm having trouble connecting right now. Please try again."
    });
  }
});

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
const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// EDU NOVA AI
// Learn. Understand. Excel.
// ===============================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ===============================
// SETTINGS
// ===============================

const DAILY_MESSAGE_LIMIT = 10;

// Use the currently available model first.
// Do NOT use gemini-2.5-flash because it is unavailable
// to new users according to the API response.
const MODELS = [
  "gemini-3.6-flash"
];

// Simple in-memory daily usage tracker.
// Note: this resets if the Render service restarts.
const usage = new Map();

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));

// ===============================
// HELPER FUNCTIONS
// ===============================

function getToday() {
  const now = new Date();

  return now.toISOString().slice(0, 10);
}

function getUserId(req) {
  // If your frontend sends a user ID, use it.
  // Otherwise use the IP address.
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

  return text.trim();
}

// ===============================
// AI GENERATION
// ===============================

async function generateAnswer(question) {
  let lastError = null;

  for (const model of MODELS) {
    console.log(`Trying model: ${model}`);

    try {
      // Stop a request from hanging for too long.
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 20000);

      try {
        const response = await ai.models.generateContent({
          model,

          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
You are EduNova AI, a helpful educational AI assistant.

Your tagline is:
"Learn. Understand. Excel."

Your job is to help students understand their school subjects clearly.

Important rules:
- Explain answers in simple, student-friendly language.
- For calculations, show the steps clearly.
- For difficult topics, explain from the basics before going deeper.
- Use examples when they make the topic easier.
- Do not unnecessarily repeat the question.
- Do not add irrelevant "related questions" or suggested questions underneath your answer.
- Keep answers focused on what the student asked.
- If the student asks a casual question, respond naturally.
- If the student asks about Economics, Mathematics, English, Accounting, Biology, Chemistry, Physics, Government, or other school subjects, teach the concept clearly.
- Never pretend to know something you don't know.

Student question:

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

        clearTimeout(timeout);

        const answer = cleanAnswer(response.text);

        console.log(`Answer generated using: ${model}`);

        return answer;

      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }

    } catch (error) {
      lastError = error;

      console.error(
        `${model} failed:`,
        error?.message || error
      );

      // If the request timed out, move on immediately.
      if (error?.name === "AbortError") {
        console.error(`${model} timed out.`);
      }
    }
  }

  throw lastError || new Error("No AI model was available.");
}

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "EduNova AI",
    message: "Learn. Understand. Excel.",
    model: MODELS[0]
  });
});

// ===============================
// CHAT API
// ===============================

app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body?.question?.trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question."
      });
    }

    console.log(`Question received: ${question}`);

    // ===========================
    // DAILY LIMIT
    // ===========================

    const userId = getUserId(req);
    const userUsage = getUsage(userId);

    if (userUsage.count >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({
        success: false,
        limitReached: true,
        message:
          "You've reached your 10 free messages for today. Come back tomorrow or upgrade to Premium for more."
      });
    }

    // ===========================
    // GENERATE ANSWER
    // ===========================

    const answer = await generateAnswer(question);

    // Count only successfully generated messages.
    userUsage.count += 1;

    const remaining = Math.max(
      DAILY_MESSAGE_LIMIT - userUsage.count,
      0
    );

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

    return res.status(500).json({
      success: false,
      error:
        "I'm having trouble connecting right now. Please try again."
    });
  }
});

// ===============================
// USAGE CHECK
// ===============================

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

// ===============================
// 404
// ===============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found."
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `EduNova AI server is running on port ${PORT}`
  );
});

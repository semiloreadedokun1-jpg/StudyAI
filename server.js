const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// Serve index.html, CSS, JS and other frontend files
app.use(express.static(__dirname));

// ===============================
// GEMINI AI
// ===============================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY is not set.");
}

const ai = apiKey
    ? new GoogleGenAI({
        apiKey: apiKey
    })
    : null;

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "NEXA AI server is running"
    });
});

// ===============================
// ASK NEXA AI
// ===============================

app.post("/api/ask", async (req, res) => {

    try {

        const question = req.body.question;

        console.log("Question received:", question);

        // Check question
        if (!question || !question.trim()) {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        // Check API key
        if (!ai) {
            return res.status(500).json({
                error: "Gemini API key is not configured."
            });
        }

        // ===============================
        // NEXA AI INSTRUCTIONS
        // ===============================

        const prompt = `
You are NEXA AI, an intelligent study assistant.

Answer the student's question directly.

IMPORTANT RULES:

- Do NOT introduce yourself.
- Do NOT say "I am NEXA AI."
- Do NOT say "Hello, I am NEXA AI."
- Do NOT start every answer with a greeting.
- Do NOT mention your name unless the student specifically asks.
- Start directly with the answer.
- Explain difficult topics in simple language.
- Give clear examples when useful.
- Show steps when solving mathematics or calculations.
- Help with Economics, Mathematics, English, and other school subjects.
- When asked for practice questions, provide useful practice questions.
- Keep explanations suitable for students.
- Be accurate and educational.

Student's question:

${question}
`;

        // ===============================
        // SEND TO GEMINI
        // ===============================

        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        const answer = result.text;

        console.log("Answer generated successfully.");

        res.json({
            answer: answer
        });

    } catch (error) {

        console.error("NEXA AI error:", error);

        res.status(500).json({
            error: "NEXA AI could not generate an answer.",
            details: error.message
        });

    }

});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXA AI server is running on port ${PORT}`);
});

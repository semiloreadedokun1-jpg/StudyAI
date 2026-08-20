const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;

// CORS
app.use(cors());

// JSON requests
app.use(express.json());

// Gemini
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
}

const ai = apiKey
    ? new GoogleGenAI({
        apiKey: apiKey
    })
    : null;


// HOME
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "NEXA AI server is running"
    });
});


// HEALTH CHECK
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "NEXA AI server is healthy"
    });
});


// ASK NEXA AI
app.post("/api/ask", async (req, res) => {

    try {

        const question = req.body.question;

        console.log("Question received:", question);

        if (!question || !question.trim()) {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        if (!ai) {
            return res.status(500).json({
                error: "Gemini API key is not configured."
            });
        }


        // AI instructions
        const prompt = `
You are NEXA AI, an intelligent study assistant.

Answer the student's question directly.

IMPORTANT RESPONSE RULES:

- Do NOT introduce yourself.
- Do NOT say "I am NEXA AI."
- Do NOT say "Hello, I am NEXA AI."
- Do NOT start every answer with greetings.
- Do NOT mention your name unless the student specifically asks for it.
- Start directly with the answer.
- Explain difficult topics clearly and simply.
- Show steps when solving calculations.
- Give examples when helpful.
- For practice requests, provide useful practice questions.
- Be accurate, educational, and easy for a student to understand.

Student's question:

${question}
`;


        // Gemini request
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


// START SERVER
app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `NEXA AI server is running on port ${PORT}`
    );

});

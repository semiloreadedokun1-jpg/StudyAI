const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "StudyAI server is running"
    });
});

// Main AI endpoint
app.post("/api/ask", async (req, res) => {
    try {
        const question = req.body.question;

        if (!question || !question.trim()) {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        console.log("Question received:", question);

        const prompt = `
You are StudyAI, a helpful AI study assistant.

Help the student understand their question clearly.

Rules:
- Give accurate and easy-to-understand answers.
- Explain difficult topics simply.
- For mathematics, show the solution step by step.
- For Economics, use correct economic terminology.
- For practice questions, provide useful practice questions.
- Keep answers educational and student-friendly.

Student question:
${question}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        const answer = response.text;

        console.log("Gemini answered successfully.");

        res.json({
            answer: answer
        });

    } catch (error) {
        console.error("Gemini error:", error);

        res.status(500).json({
            error: "StudyAI could not generate an answer.",
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI server running on port ${PORT}`);
});

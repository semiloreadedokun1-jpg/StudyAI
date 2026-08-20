require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

// Render provides the PORT automatically
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini API key comes ONLY from Render Environment Variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

// StudyAI identity
const STUDYAI_INSTRUCTIONS = `
You are StudyAI, an AI study assistant.

Your name is StudyAI.

StudyAI was created by Oluwasemilore Adedokun.
StudyAI uses Google's Gemini AI technology to generate its responses.

If someone asks "Who are you?", say:
"I am StudyAI, an AI study assistant created by Oluwasemilore Adedokun and powered by Google's Gemini AI technology."

If someone asks "Who created you?", say:
"I was created by Oluwasemilore Adedokun, and I use Google's Gemini AI technology to power my responses."

If someone asks what powers you, explain that StudyAI uses Google's Gemini AI technology.

You can explain other AI applications and websites when asked.

Be helpful, friendly, and useful for students.
Explain difficult topics clearly and use simple examples.
If you are unsure about something, say so instead of making up information.
`;

// Test the backend
app.get("/", (req, res) => {
    res.send("StudyAI backend is running 🚀");
});

// Ask StudyAI
app.post("/api/ask", async (req, res) => {
    const { question } = req.body;

    if (!question || !question.trim()) {
        return res.status(400).json({
            error: "Please enter a question."
        });
    }

    if (!apiKey) {
        return res.status(500).json({
            error: "GEMINI_API_KEY is not configured on the server."
        });
    }

    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${STUDYAI_INSTRUCTIONS}

User question:
${question}`
        });

        const answer =
            result.text || "I couldn't generate an answer.";

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.send(answer);

    } catch (error) {
        console.error("Gemini error:", error);

        res.status(500).json({
            error: "StudyAI could not get an answer from Gemini."
        });
    }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI server is running on port ${PORT}`);
});

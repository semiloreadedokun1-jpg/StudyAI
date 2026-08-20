require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

const STUDYAI_INSTRUCTIONS = `
You are StudyAI, an AI study assistant.

Your name is StudyAI.

StudyAI was created by Oluwasemilore Adedokun.

StudyAI uses Google's Gemini AI technology to power its responses.

If someone asks "Who are you?", say:
"I am StudyAI, an AI study assistant created by Oluwasemilore Adedokun and powered by Google's Gemini AI technology."

If someone asks "Who created you?", say:
"I was created by Oluwasemilore Adedokun, and I use Google's Gemini AI technology to power my responses."

If someone asks "What powers you?", say:
"I use Google's Gemini AI technology through the Gemini API."

Be helpful, friendly, and useful for students.

Explain difficult topics clearly and simply.
Give examples when helpful.
For school questions, provide accurate explanations.
If you are unsure, say so instead of making up information.
`;

app.get("/", (req, res) => {
    res.send("StudyAI backend is running 🚀");
});

app.post("/api/ask", async (req, res) => {
    const { question } = req.body;

    if (!question || !question.trim()) {
        return res.status(400).json({
            error: "Please enter a question."
        });
    }

    if (!apiKey) {
        return res.status(500).json({
            error: "StudyAI API key is not configured."
        });
    }

    try {
        const result = await ai.models.generateContentStream({
            model: "gemini-flash-latest",
            contents: `
${STUDYAI_INSTRUCTIONS}

User question:
${question}
`
        });

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        for await (const chunk of result) {
            const text = chunk.text || "";

            if (text) {
                res.write(text);
            }
        }

        res.end();

    } catch (error) {
        console.error("Gemini error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                error: "StudyAI could not get an answer from Gemini."
            });
        } else {
            res.end();
        }
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI server is running on port ${PORT}`);
});

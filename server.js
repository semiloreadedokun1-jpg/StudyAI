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
    console.error("GEMINI_API_KEY is missing from the environment variables.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

const STUDYAI_INSTRUCTIONS = `
You are StudyAI, an AI study assistant.

Your name is StudyAI.

StudyAI was created by Oluwasemilore Adedokun.

StudyAI uses Google's Gemini AI technology/API to generate its AI responses.

If someone asks "Who are you?", say:
"I am StudyAI, an AI study assistant created by Oluwasemilore Adedokun and powered by Google's Gemini AI technology."

If someone asks "Who created you?", say:
"I was created by Oluwasemilore Adedokun, and I use Google's Gemini AI technology to power my responses."

If someone asks "What powers you?", say:
"I use Google's Gemini AI technology through the Gemini API."

If someone asks about Google, explain that Google provides the Gemini AI technology used by StudyAI.

Be helpful, friendly, and especially useful for students.

Explain difficult topics in simple language.

Use clear examples when helpful.

For school questions, give accurate and easy-to-understand explanations.

If you are unsure about something, say so instead of making up information.
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
            error: "StudyAI API key is not configured on the server."
        });
    }

    try {
        const result = await ai.models.generateContentStream({
            model: "gemini-3.6-flash",
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

        res.setHeader(
            "Connection",
            "keep-alive"
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

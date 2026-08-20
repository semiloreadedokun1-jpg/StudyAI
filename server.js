require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
} else {
    console.log("GEMINI_API_KEY is loaded.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

const STUDYAI_INSTRUCTIONS = `
You are StudyAI, a natural, intelligent and helpful AI study assistant.

Answer the user's question directly.

IMPORTANT RESPONSE RULES:

- Start directly with the answer.
- Do not say hello unless the user says hello first.
- Do not introduce yourself.
- Do not say "I am StudyAI."
- Do not say "I'm StudyAI."
- Do not say "I'd be happy to help."
- Do not mention the creator in normal answers.
- Do not mention Oluwasemilore Adedokun in normal answers.
- Do not mention Google or Gemini in normal answers.
- Do not repeat the user's question unnecessarily.
- Do not add unnecessary filler.
- Be natural and conversational.
- Explain things clearly.
- Adapt your explanation to the user's level.

For mathematics:
- Show calculations step by step.
- Explain the method.
- Check the final answer.

For economics:
- Use correct economics terminology.
- Explain concepts simply.
- Give examples when useful.

For practice questions:
- Give the questions directly.
- Do not add unnecessary introductions.

For follow-up questions:
- Use the conversation context when available.
- Understand references such as "number 3", "why?", "continue", or "explain that".

CREATOR INFORMATION:

StudyAI was created by Oluwasemilore Adedokun.

Only mention this information if the user specifically asks who created,
made, developed, or owns StudyAI.

If asked who created StudyAI, answer:
"StudyAI was created by Oluwasemilore Adedokun."

TECHNOLOGY INFORMATION:

Only mention Google Gemini if the user specifically asks what technology
or AI model powers StudyAI.

If asked what powers StudyAI, answer:
"StudyAI uses Google's Gemini AI technology."

Never invent facts.

If you do not know something, say so.

Your main goal is to answer the user's actual question clearly and naturally.
`;

// ================================
// HOME / HEALTH CHECK
// ================================

app.get("/", (req, res) => {
    res.status(200).send("StudyAI backend is running 🚀");
});

// ================================
// MODEL CHECK
// ================================

app.get("/api/models", async (req, res) => {

    if (!apiKey) {
        return res.status(500).json({
            success: false,
            error: "GEMINI_API_KEY is not configured."
        });
    }

    try {

        console.log("Checking Gemini models...");

        const models = await ai.models.list();

        const availableModels = [];

        for await (const model of models) {

            availableModels.push({
                name: model.name,
                displayName: model.displayName
            });

        }

        console.log(
            "Available Gemini models:",
            availableModels
        );

        res.status(200).json({
            success: true,
            models: availableModels
        });

    } catch (error) {

        console.error(
            "Model list error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ================================
// ASK STUDYAI
// ================================

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

        console.log("Question received:", question);

        const result = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: `
${STUDYAI_INSTRUCTIONS}

USER QUESTION:
${question}
`
        });

        const answer =
            result.text || "I couldn't generate an answer.";

        console.log("StudyAI response generated successfully.");

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.status(200).send(answer);

    } catch (error) {

        console.error("Gemini error:", error);

        res.status(500).json({
            error: "StudyAI could not get an answer from Gemini."
        });
    }
});

// ================================
// START SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `StudyAI

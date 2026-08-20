require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

// Render gives us the PORT automatically.
// 10000 is the normal Render default for web services.
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini API key
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing!");
} else {
    console.log("✅ GEMINI_API_KEY is loaded.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

// StudyAI instructions
const STUDYAI_INSTRUCTIONS = `
You are StudyAI, an AI study assistant.

Your name is StudyAI.

StudyAI was created by Oluwasemilore Adedokun.

StudyAI uses Google's Gemini AI technology to generate its responses.

If someone asks "Who are you?", say:
"I am StudyAI, an AI study assistant created by Oluwasemilore Adedokun and powered by Google's Gemini AI technology."

If someone asks "Who created you?", say:
"I was created by Oluwasemilore Adedokun, and I use Google's Gemini AI technology to power my responses."

If someone asks "What powers you?", say:
"StudyAI uses Google's Gemini AI technology to power its AI responses."

If someone asks about StudyAI, explain that StudyAI is an AI study assistant designed to help students learn, understand difficult topics, practice questions, work through calculations, and study more effectively.

You can also explain other AI applications and websites such as ChatGPT, Gemini, Claude, Microsoft Copilot, and Perplexity when users ask about them.

Do not confuse StudyAI with Google Gemini, ChatGPT, Claude, or other AI applications.

Be helpful, friendly, and useful for students.

Explain difficult topics clearly and use simple examples.

If you are unsure about something, say so instead of making up information.
`;

// Test route
app.get("/", (req, res) => {
    res.status(200).send("StudyAI backend is running 🚀");
});

// AI route
app.post("/api/ask", async (req, res) => {

    const question = req.body?.question;

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

        console.log(`📚 Question received: ${question}`);

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",

            contents: `${STUDYAI_INSTRUCTIONS}

User question:
${question}`
        });

        const answer =
            result.text || "I couldn't generate an answer.";

        console.log("✅ Gemini answered successfully.");

        res.status(200).send(answer);

    } catch (error) {

        console.error("❌ Gemini

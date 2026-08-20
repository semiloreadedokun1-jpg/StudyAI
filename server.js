require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini API key comes from Render Environment Variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing!");
} else {
    console.log("✅ GEMINI_API_KEY is loaded.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});


// =====================================================
// STUDYAI INSTRUCTIONS
// =====================================================

const STUDYAI_INSTRUCTIONS = `
You are StudyAI, a highly capable and natural AI study assistant.

Your job is to answer the user's questions clearly, accurately,
naturally, and directly.

RESPONSE STYLE:

- Start directly with the answer.
- Do not greet the user unless the user greets you first.
- Do not introduce yourself before answering.
- Do not say "Hello, I am StudyAI."
- Do not say "I'm StudyAI."
- Do not say "I would be happy to help."
- Do not mention the creator in normal answers.
- Do not mention Oluwasemilore Adedokun in normal answers.
- Do not mention Google or Gemini in normal answers.
- Do not repeat the user's question unnecessarily.
- Do not add unnecessary introductions.
- Answer naturally, like a knowledgeable AI tutor.

CONVERSATION:

Understand follow-up questions using the conversation context
provided to you.

If the user asks a follow-up question, answer based on what they
are currently discussing.

STUDY HELP:

Help students with subjects including:

- Economics
- Mathematics
- English
- Accounting
- Government
- Biology
- Chemistry
- Physics
- Computer Science
- History
- Geography
- Business studies
- Other academic subjects

When explaining a difficult topic:

1. Give a clear definition.
2. Explain the idea simply.
3. Give an example when useful.
4. Highlight important points.
5. Give practice questions when requested.

MATHEMATICS:

For calculations:

- Show the working step by step.
- Do not skip important steps.
- Check the calculation before giving the final answer.
- Clearly identify the final answer.

For algebra, calculus, statistics, economics calculations,
and other mathematical problems, explain the method so the
student can learn it.

ECONOMICS:

Use proper economics terminology while keeping explanations
easy to understand.

Explain concepts such as:

- Scarcity
- Choice
- Opportunity cost
- Demand
- Supply
- Equilibrium
- Utility
- Production
- Inflation
- Unemployment
- National income
- Microeconomics
- Macroeconomics

Use realistic examples when useful.

PRACTICE QUESTIONS:

If the user asks for practice questions, give the questions
directly.

Do not introduce them with unnecessary greetings.

If answers are requested, provide the answers and explanations.

CREATOR INFORMATION:

StudyAI was created by Oluwasemilore Adedokun.

Only mention the creator if the user specifically asks:

- Who created StudyAI?
- Who made StudyAI?
- Who developed StudyAI?
- Who owns StudyAI?
- Who is the creator of StudyAI?

If asked who created StudyAI, answer:

"StudyAI was created by Oluwasemilore Adedokun."

TECHNOLOGY INFORMATION:

Only mention Google Gemini if the user specifically asks what
technology or AI model powers StudyAI.

If asked what powers StudyAI, answer:

"StudyAI uses Google's Gemini AI technology."

For normal questions, focus completely on answering the user's
question.

Never invent facts.

If you are unsure about something, say so clearly.

Be natural, intelligent, helpful, and student-friendly.
`;


// =====================================================
// HOME / HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.status(200).send("StudyAI backend is running 🚀");
});


// =====================================================
// GEMINI MODEL DIAGNOSTIC
// =====================================================

app.get("/api/models", async (req, res) => {

    if (!apiKey) {
        return res.status(500).json({
            success: false,
            error: "GEMINI_API_KEY is not configured."
        });
    }

    try {

        console.log("Checking available Gemini models...");

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


// =====================================================
// ASK STUDYAI
// =====================================================

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

        console.log(
            "Question received:",
            question
        );

        const result = await ai.models.generateContent({

            // We will verify the correct model using /api/models
            model: "gemini-2.5-flash",

            contents: `
${STUDYAI_INSTRUCTIONS}

USER QUESTION:
${question}
`
        });

        const answer =
            result.text ||
            "I couldn't generate an answer.";

        console.log(
            "StudyAI response generated successfully."
        );

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.status(200).send(answer);

    } catch (error) {

        console.error(
            "Gemini error:",
            error
        );

        res.status(500).json({
            error: "StudyAI could not get an answer from Gemini."
        });
    }
});


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `StudyAI server is running on port ${PORT}`
        );

    }
);

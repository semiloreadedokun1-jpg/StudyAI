const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

// ===============================
// CORS
// ===============================

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

// ===============================
// Middleware
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// Gemini AI
// ===============================

if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing.");
} else {
    console.log("✅ GEMINI_API_KEY detected.");
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

// ===============================
// Health Check
// ===============================

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "StudyAI server is running"
    });
});

// ===============================
// Homepage
// ===============================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// Ask StudyAI
// ===============================

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

Your job is to help students understand their school subjects.

Instructions:
- Give clear and accurate answers.
- Explain difficult topics in simple language.
- For mathematics, show the solution step by step.
- For Economics, use correct economic terminology and explain the terms.
- For practice questions, give useful questions appropriate for a student.
- Be educational, friendly, and concise.
- If you are unsure about something, say so instead of making up information.

Student's question:

${question}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        const answer = response.text;

        console.log("Gemini answered successfully.");

        return res.json({
            answer

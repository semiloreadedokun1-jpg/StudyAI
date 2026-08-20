require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing.");
}

const ai = API_KEY
    ? new GoogleGenAI({
        apiKey: API_KEY
    })
    : null;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "NEXA AI server is running"
    });
});

app.post("/api/ask", async (req, res) => {

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

    const prompt = `
You are NEXA AI, an intelligent study assistant.

Help students understand school subjects clearly.

Rules:
- Start directly with the answer.
- Explain difficult topics simply.
- Use correct academic terminology.
- Give examples when useful.
- For Mathematics, show calculations step by step.
- For Economics, explain concepts using proper economic terminology.
- For English, explain grammar clearly and give examples.
- For practice requests, provide useful questions.
- Do not make up facts.
- If the question is unclear, ask for clarification.

Student's question:

${question}
`;

    try {

        const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt
        });

        const answer = response.text;

        if (!answer) {
            return res.status(500).json({
                error: "NEXA AI did not return an answer."
            });
        }

        console.log("NEXA AI answered successfully.");

        return res.json({
            answer: answer
        });

    } catch (error) {

        console.error("NEXA AI error:", error);

        return res.status(500).json({
            error: "NEXA AI could not generate an answer."
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXA AI server is running on port ${PORT}`);
});

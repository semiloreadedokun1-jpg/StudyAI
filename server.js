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

/*
========================================
HOME
========================================
*/

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/*
========================================
HEALTH CHECK
========================================
*/

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "EduNova AI server is running"
    });
});

/*
========================================
GENERATE ANSWER
========================================
*/

async function generateAnswer(question) {

    const prompt = `
You are EduNova AI, a fast and helpful study assistant.

The student's question is:

${question}

Instructions:

- Answer directly.
- Do not say "I am EduNova AI" unless asked.
- Use simple language that a student can understand.
- For Mathematics, show the calculation steps clearly.
- For Economics, use correct economic terminology and explain the terms.
- For English, explain grammar clearly and give examples when useful.
- For science subjects, explain concepts step by step.
- If the question is simple, keep the answer reasonably short.
- Do not add unnecessary "related questions" underneath the answer.
- Do not repeat the student's question.
- Be accurate and educational.
`;

    const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash"
    ];

    let lastError = null;

    for (const model of models) {

        try {

            console.log("Trying model:", model);

            const response =
                await ai.models.generateContent({
                    model,
                    contents: prompt
                });

            const answer = response.text;

            if (answer && answer.trim()) {

                console.log(
                    "Answer generated using:",
                    model
                );

                return answer.trim();
            }

        } catch (error) {

            lastError = error;

            console.error(
                `${model} failed:`,
                error?.message || error
            );

            continue;
        }
    }

    throw lastError ||
        new Error("All Gemini models failed.");
}

/*
========================================
ASK EDUNOVA AI
========================================
*/

app.post("/api/ask", async (req, res) => {

    const question = req.body.question;

    console.log(
        "Question received:",
        question
    );

    if (
        !question ||
        typeof question !== "string" ||
        !question.trim()
    ) {

        return res.status(400).json({
            error: "Please enter a question."
        });
    }

    if (!ai) {

        return res.status(500).json({
            error:
                "Gemini API key is not configured on the server."
        });
    }

    try {

        const answer =
            await generateAnswer(
                question.trim()
            );

        return res.json({
            answer
        });

    } catch (error) {

        console.error(
            "EduNova AI error:",
            error
        );

        const status =
            error?.status ||
            error?.code ||
            error?.error?.code;

        if (status === 429) {

            return res.status(429).json({
                error:
                    "EduNova AI is temporarily busy. Please try again shortly."
            });
        }

        if (status === 503) {

            return res.status(503).json({
                error:
                    "The AI model is temporarily busy. Please try again shortly."
            });
        }

        return res.status(500).json({
            error:
                "EduNova AI could not generate an answer right now."
        });
    }
});

/*
========================================
START SERVER
========================================
*/

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `EduNova AI server is running on port ${PORT}`
        );

    }
);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;

// Allow requests from your website
app.use(cors());

// Read JSON requests
app.use(express.json());

// Serve your website files
app.use(express.static(path.join(__dirname)));

// Gemini API
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ================================
// HOME PAGE
// ================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "index.html")
    );
});


// ================================
// HEALTH CHECK
// ================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "NEXA AI server is running"
    });
});


// ================================
// ASK NEXA AI
// ================================

app.post("/api/ask", async (req, res) => {

    try {

        const question =
            typeof req.body.question === "string"
                ? req.body.question.trim()
                : "";

        // Check question
        if (!question) {

            return res.status(400).json({
                error: "Please enter a question."
            });

        }


        // Check API key
        if (!process.env.GEMINI_API_KEY) {

            console.error(
                "GEMINI_API_KEY is missing."
            );

            return res.status(500).json({
                error:
                    "NEXA AI is not configured correctly. The Gemini API key is missing."
            });

        }


        // NEXA AI instructions
        const prompt = `
You are NEXA AI, an intelligent study assistant.

Answer the student's question directly.

IMPORTANT RESPONSE RULES:

- Do NOT introduce yourself.
- Do NOT say "I am NEXA AI."
- Do NOT say "Hello, I am NEXA AI."
- Do NOT start every answer with a greeting.
- Do NOT mention your name unless the student specifically asks.
- Start directly with the answer.
- Explain difficult topics clearly and simply.
- Use examples when helpful.
- Show clear steps when solving calculations.
- For practice requests, provide useful practice questions.
- Make explanations suitable for a student.
- Be accurate and educational.
- Do not unnecessarily repeat the question.

Student's question:

${question}
`;


        console.log(
            "Question received:",
            question
        );


        // Ask Gemini
        const response =
            await ai.models.generateContent({

                model: "gemini-3.6-flash",

                contents: prompt

            });


        // Get answer
        const answer =
            response.text;


        if (!answer) {

            console.error(
                "Gemini returned no text."
            );

            return res.status(500).json({
                error:
                    "NEXA AI could not generate an answer."
            });

        }


        console.log(
            "Answer generated successfully."
        );


        // Send answer to website
        return res.json({
            answer: answer
        });


    } catch (error) {

        console.error(
            "NEXA AI error:",
            error
        );


        return res.status(500).json({
            error:
                "NEXA AI could not generate an answer."
        });

    }

});


// ================================
// START SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `NEXA AI server is running on port ${PORT}`
    );

});

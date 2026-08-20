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
HOME PAGE
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
        message: "NEXA AI server is running"
    });
});


/*
========================================
GENERATE FAST ANSWER
========================================
*/

async function generateAnswer(prompt) {

    /*
    Try the fastest model first.
    If it is temporarily unavailable,
    use the fallback model.
    */

    const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash"
    ];

    let lastError = null;

    for (const model of models) {

        try {

            console.log(
                "Trying model:",
                model
            );

            const response =
                await ai.models.generateContent({
                    model: model,
                    contents: prompt
                });

            const answer =
                response.text;

            if (
                answer &&
                answer.trim()
            ) {

                console.log(
                    "Answer generated using:",
                    model
                );

                return answer;
            }

        } catch (error) {

            lastError = error;

            console.error(
                model,
                "failed:",
                error.message || error
            );

            /*
            Move immediately to the next
            model instead of waiting through
            multiple retries.
            */

            continue;
        }
    }

    throw lastError ||
        new Error(
            "All Gemini models failed."
        );
}


/*
========================================
ASK NEXA AI
========================================
*/

app.post("/api/ask", async (req, res) => {

    const question =
        req.body.question;


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
            error:
                "Please enter a question."
        });

    }


    if (!ai) {

        return res.status(500).json({
            error:
                "Gemini API key is not configured."
        });

    }


    /*
    ========================================
    SHORT, FAST PROMPT
    ========================================
    */

    const prompt = `
You are NEXA AI, a fast and helpful study assistant.

Answer the student's question clearly and accurately.

Rules:
- Start directly with the answer.
- Use simple student-friendly language.
- Explain difficult ideas clearly.
- For Mathematics, show steps.
- For Economics, use correct economic terminology.
- For English, explain grammar with examples.
- Give examples when useful.
- Do not introduce yourself unless asked.
- Do not unnecessarily repeat the question.
- Keep the answer focused.

Student question:

${question}
`;


    try {

        const answer =
            await generateAnswer(prompt);


        console.log(
            "Answer generated successfully."
        );


        return res.json({
            answer: answer
        });


    } catch (error) {

        console.error(
            "NEXA AI final error:",
            error
        );


        const status =
            error?.status ||
            error?.code ||
            error?.error?.code;


        if (status === 429) {

            return res.status(429).json({
                error:
                    "NEXA AI is temporarily busy. Please try again."
            });

        }


        if (status === 503) {

            return res.status(503).json({
                error:
                    "Gemini is temporarily busy. Please try again shortly."
            });

        }


        return res.status(500).json({
            error:
                "NEXA AI could not generate an answer."
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
            `NEXA AI server is running on port ${PORT}`
        );

    }
);

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
GEMINI REQUEST WITH RETRY
========================================
*/

async function generateAnswer(prompt) {

    const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash"
    ];

    let lastError = null;

    for (const model of models) {

        for (let attempt = 1; attempt <= 2; attempt++) {

            try {

                console.log(
                    `Trying ${model} - attempt ${attempt}`
                );

                const response =
                    await ai.models.generateContent({
                        model: model,
                        contents: prompt
                    });

                const answer = response.text;

                if (answer && answer.trim()) {

                    console.log(
                        `Answer generated successfully using ${model}.`
                    );

                    return answer;
                }

                throw new Error(
                    "Model returned an empty answer."
                );

            } catch (error) {

                lastError = error;

                console.error(
                    `${model} attempt ${attempt} failed:`,
                    error.message || error
                );

                const status =
                    error.status ||
                    error.code ||
                    error?.error?.code;

                /*
                Retry temporary server/capacity errors.
                */

                if (
                    status === 503 ||
                    status === 500 ||
                    status === 429
                ) {

                    if (attempt < 2) {

                        await new Promise(
                            resolve =>
                                setTimeout(resolve, 1500)
                        );

                    }

                    continue;
                }

                /*
                If this model has another type of
                error, move to the next model.
                */

                break;
            }
        }
    }

    throw lastError ||
        new Error("All Gemini models failed.");
}


/*
========================================
ASK NEXA AI
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


    const prompt = `
You are NEXA AI, an intelligent AI study assistant.

Your job is to help students understand school subjects.

IMPORTANT RULES:

- Start directly with the answer.
- Do not introduce yourself unless asked.
- Do not repeatedly say your name.
- Explain difficult topics in simple student-friendly language.
- Use correct academic terminology.
- Give examples when useful.
- For Mathematics, show calculations step by step.
- For Economics, use correct economic terminology and explain it clearly.
- For English, explain grammar and give examples.
- For practice requests, create useful questions.
- For assignments, help the student understand the work.
- Do not make up facts.
- If a question is unclear, ask for clarification.
- Keep the answer clear and educational.

Student's question:

${question}
`;


    try {

        const answer =
            await generateAnswer(prompt);


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
                    "NEXA AI is temporarily busy. Please try again shortly."
            });

        }


        if (status === 503) {

            return res.status(503).json({
                error:
                    "Gemini is temporarily experiencing high demand. Please try again shortly."
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

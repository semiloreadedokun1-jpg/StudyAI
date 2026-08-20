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
    console.error("❌ GEMINI_API_KEY is missing");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});

const STUDYAI_INSTRUCTIONS = `
You are StudyAI, a natural and helpful AI study assistant.

Answer the user's question directly.

Do not greet the user unless they greet you first.
Do not introduce yourself.
Do not say "I am StudyAI."
Do not mention the creator in normal answers.
Do not mention Oluwasemilore Adedokun unless the user specifically asks who created StudyAI.
Do not mention Google or Gemini unless the user specifically asks what powers StudyAI.

For normal questions, go straight to the answer.

Explain difficult topics clearly and simply.
Use examples when useful.
For mathematics, show working step by step.
For economics, use correct economics terminology and simple examples.
For practice questions, give the questions directly.

If the user asks who created StudyAI, answer:
"StudyAI was created by Oluwasemilore Adedokun."

If the user asks what powers StudyAI, answer:
"StudyAI uses Google's Gemini AI technology."

Never invent facts.
`;

app.get("/", (req, res) => {
    res.status(200).send("StudyAI backend is running 🚀");
});

app.post("/api/ask", async (req, res) => {
    const question = String(req.body?.question || "").trim();

    if (!question) {
        return res.status(400).json({
            error: "Please enter a question."
        });
    }

    try {
        console.log("📚 Question:", question);

        const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: question,
            config: {
                systemInstruction: STUDYAI_INSTRUCTIONS
            }
        });

        const answer = response.text?.trim();

        if (!answer) {
            console.error("❌ Gemini returned no text:", response);

            return res.status(502).json({
                error: "Gemini returned an empty response."
            });
        }

        console.log("✅ Gemini answered successfully");

        res.status(200).type("text/plain").send(answer);

    } catch (error) {
        console.error("❌ GEMINI ERROR");
        console.error("Message:", error?.message);
        console.error("Status:", error?.status);
        console.error("Code:", error?.code);

        return res.status(502).json({
            error: "Gemini request failed.",
            details: error?.message || "Unknown Gemini error"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 StudyAI server is running on port ${PORT}`);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

// Render provides PORT automatically
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Test route
app.get("/", (req, res) => {
    res.send("StudyAI backend is running 🚀");
});

// AI question route
app.post("/api/ask", async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({
            error: "Please enter a question."
        });
    }

    try {
        const result = await ai.models.generateContentStream({
            model: "gemini-3.6-flash",
            contents: question
        });

        // Send Gemini's response as it arrives
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of result) {
            const text = chunk.text || "";

            if (text) {
                res.write(text);
            }
        }

        res.end();

    } catch (error) {
        console.error("Gemini error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                error: "StudyAI could not get an answer from Gemini."
            });
        } else {
            res.end();
        }
    }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI server is running on port ${PORT}`);
});
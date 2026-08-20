    const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({
  apiKey: API_KEY
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "StudyAI server is running"
  });
});

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

Help the student understand the question clearly.

Rules:
- Give a clear and accurate answer.
- Explain difficult ideas in simple language.
- For mathematics, show the steps.
- For Economics, use correct economic terminology and explain each term.
- If the question is asking for practice questions, provide useful practice questions.
- Do not pretend to know something if you are unsure.

Student's question:
${question}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });

    const answer = response.text;

    console.log("Gemini answered successfully.");

    res.json({
      answer: answer
    });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Sorry, StudyAI could not answer right now.",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StudyAI server running on port ${PORT}`);
});

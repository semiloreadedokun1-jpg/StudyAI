const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 10000;

// ======================================================
// EDU NOVA AI
// Learn. Understand. Excel.
// ======================================================

const DAILY_MESSAGE_LIMIT = 10;

// Gemini model
const MODEL = "gemini-2.5-flash";

// Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Simple in-memory usage tracker.
// Resets when the Render service restarts.
const usage = new Map();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

// ======================================================
// HELPERS
// ======================================================

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getUserId(req) {
  return (
    req.body?.userId ||
    req.headers["x-user-id"] ||
    req.ip ||
    "anonymous"
  );
}

function getUsage(userId) {
  const today = getToday();

  let record = usage.get(userId);

  if (!record || record.date !== today) {
    record = {
      date: today,
      count: 0
    };

    usage.set(userId, record);
  }

  return record;
}

function cleanAnswer(text) {
  if (!text) {
    return "I couldn't generate an answer right now. Please try again.";
  }

  return String(text).trim();
}

// ======================================================
// GENERATE AI ANSWER
// ======================================================

async

async function askAI(question) {
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get an answer");
    }

    return data.answer;

  } catch (error) {
    console.error("StudyAI error:", error);
    throw new Error("Failed to fetch");
  }
}

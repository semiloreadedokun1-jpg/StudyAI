async function askAI() {
    const question = document.getElementById("question").value.trim();
    const responseBox = document.getElementById("response");

    if (!question) {
        alert("Please enter a question first.");
        return;
    }

    responseBox.style.display = "block";
    responseBox.innerHTML = "🤖 StudyAI is thinking...";

    try {
        const response = await fetch("http://localhost:3000/api/ask", {
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
            throw new Error(data.error || "Something went wrong.");
        }

        responseBox.innerHTML =
            "<strong>StudyAI:</strong><br><br>" +
            data.answer;

    } catch (error) {
        responseBox.innerHTML =
            "❌ I couldn't connect to the StudyAI server.<br><br>" +
            error.message;
    }
}
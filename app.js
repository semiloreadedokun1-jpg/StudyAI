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
        const response = await fetch(
            "https://studyai-qkgp.onrender.com/api/ask",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question
                })
            }
        );

        if (!response.ok) {
            let errorMessage = "Something went wrong.";

            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // Server returned a non-JSON error
            }

            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error("No response received from StudyAI.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let answer = "";

        responseBox.innerHTML =
            "<strong>StudyAI:</strong><br><br>";

        while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            const text = decoder.decode(value, {
                stream: true
            });

            answer += text;

            responseBox.innerHTML =
                "<strong>StudyAI:</strong><br><br>" +
                answer
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br>");
        }

        // Make sure any remaining streamed text is decoded
        answer += decoder.decode();

        responseBox.innerHTML =
            "<strong>StudyAI:</strong><br><br>" +
            answer
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>");

    } catch (error) {
        console.error("StudyAI error:", error);

        responseBox.innerHTML =
            "❌ I couldn't connect to the StudyAI server.<br><br>" +
            error.message;
    }
}

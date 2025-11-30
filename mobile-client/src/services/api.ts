// REPLACE THIS WITH YOUR COMPUTER'S LOCAL IP ADDRESS
// For USB Debugging with `adb reverse`, use "http://localhost:8000"
const API_URL = "https://janus-ai-production.up.railway.app";

export const ApiService = {
  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/`);
      return await response.json();
    } catch (e) {
      console.error("API Connection Error:", e);
      return null;
    }
  },

  async generateQuizFromText(text: string) {
    try {
      const response = await fetch(`${API_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return await response.json();
    } catch (e) {
      console.error("Quiz Generation Error:", e);
      throw e;
    }
  },

  async uploadPdf(fileUri: string, fileName: string, fileType: string) {
    const formData = new FormData();
    // @ts-ignore
    formData.append("file", { uri: fileUri, name: fileName, type: fileType });

    try {
      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });
      return await response.json();
    } catch (e) {
      console.error("PDF Upload Error:", e);
      throw e;
    }
  },

  /**
   * Grade a single answer
   */
  async gradeAnswer(
    question: string,
    userAnswer: string,
    context: string,
    type: "mcq" | "short" | "long"
  ) {
    try {
      const response = await fetch(`${API_URL}/grade-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_type: type,
          question,
          user_answer: userAnswer,
          correct_answer_or_context: context,
        }),
      });
      return await response.json();
    } catch (e) {
      console.error("Grading Error:", e);
      return { score: 0, feedback: "Error connecting to grader." };
    }
  },
};

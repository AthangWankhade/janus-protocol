import { ApiService } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function QuizPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const { currentQuiz } = useAppStore();

  useEffect(() => {
    if (currentQuiz) {
      try {
        const data = currentQuiz;
        // Flatten all questions into a single array
        const allQuestions = [
          ...(data.mcqs || []).map((q: any) => ({ ...q, type: "mcq" })),
          ...(data.short_answer || []).map((q: any) => ({
            ...q,
            type: "short",
          })),
          ...(data.long_answer || []).map((q: any) => ({ ...q, type: "long" })),
        ];
        setQuestions(allQuestions);
      } catch (e) {
        Alert.alert("Error", "Failed to load quiz data.");
        router.back();
      }
    }
  }, [currentQuiz]);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;

    setIsGrading(true);
    const currentQ = questions[currentIndex];

    // For MCQs, context is the correct answer option.
    // For Subjective, it's the context/rubric (which we might not have perfectly here, so we send the question itself as context fallback).
    const context =
      currentQ.type === "mcq" ? currentQ.answer : currentQ.question;

    const result = await ApiService.gradeAnswer(
      currentQ.question,
      userAnswer,
      context,
      currentQ.type
    );

    setFeedback(result);
    const incomingScore = parseFloat(result.score);
    setScore((prev) => prev + (isNaN(incomingScore) ? 0 : incomingScore));
    setIsGrading(false);
  };

  const handleNext = () => {
    setFeedback(null);
    setUserAnswer("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (questions.length === 0)
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );

  if (isFinished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Quiz Complete!</Text>
          <Text style={styles.finalScore}>
            Final Score:{" "}
            {(isNaN(score) || questions.length === 0
              ? 0
              : (score / (questions.length * 10)) * 10
            ).toFixed(1)}{" "}
            / 10
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Back to Chat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.progress}>
          Question {currentIndex + 1} / {questions.length}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionType}>
            {currentQ.type === "mcq" ? "Multiple Choice" : "Subjective"}
          </Text>
          <Text style={styles.questionText}>{currentQ.question}</Text>
        </View>

        {/* Answer Section */}
        {!feedback ? (
          <View style={styles.inputSection}>
            {currentQ.type === "mcq" ? (
              <View>
                {currentQ.options.map((opt: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      userAnswer === opt && styles.optionSelected,
                    ]}
                    onPress={() => setUserAnswer(opt)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        userAnswer === opt && styles.optionTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Type your answer here..."
                value={userAnswer}
                onChangeText={setUserAnswer}
              />
            )}

            <TouchableOpacity
              style={[styles.button, isGrading && { opacity: 0.7 }]}
              onPress={handleSubmitAnswer}
              disabled={isGrading}
            >
              {isGrading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Submit Answer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.feedbackSection}>
            <View
              style={[
                styles.feedbackHeader,
                feedback.score >= 5 ? styles.bgGreen : styles.bgRed,
              ]}
            >
              {feedback.score >= 5 ? (
                <CheckCircle color="#FFF" />
              ) : (
                <XCircle color="#FFF" />
              )}
              <Text style={styles.feedbackTitle}>
                {feedback.score >= 5 ? "Correct" : "Incorrect"}
              </Text>
            </View>
            <Text style={styles.feedbackText}>{feedback.feedback}</Text>
            {feedback.improvement_tips && (
              <Text style={styles.tipText}>💡 {feedback.improvement_tips}</Text>
            )}

            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>
                {currentIndex === questions.length - 1
                  ? "Finish"
                  : "Next Question"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  progress: { fontSize: 16, fontWeight: "600", color: "#666" },
  content: { padding: 20 },
  questionCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
  },
  questionType: {
    color: "#2563EB",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    lineHeight: 26,
  },

  // MCQ Options
  optionButton: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionSelected: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  optionText: { fontSize: 16, color: "#374151" },
  optionTextSelected: { color: "#FFF", fontWeight: "bold" },

  textArea: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 16,
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },

  // Feedback
  feedbackSection: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    padding: 20,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bgGreen: { backgroundColor: "#10B981" },
  bgRed: { backgroundColor: "#EF4444" },
  feedbackTitle: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  feedbackText: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 12,
    lineHeight: 24,
  },
  tipText: {
    fontSize: 14,
    color: "#F59E0B",
    fontStyle: "italic",
    marginBottom: 20,
  },

  // Result
  resultCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  finalScore: { fontSize: 24, color: "#2563EB", marginBottom: 40 },
  inputSection: { marginBottom: 20 },
});

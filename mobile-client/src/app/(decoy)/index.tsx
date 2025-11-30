import { ApiService } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { MoreVertical, Paperclip, Send } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SECRET_PHRASE = "daddys little slut";

export default function DecoyChatScreen() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    {
      id: number | string;
      text?: string;
      sender: "user" | "bot";
      type?: "text" | "quiz";
      data?: any;
    }[]
  >([
    {
      id: 1,
      text: "Hello! Upload a PDF or paste text to generate a quiz.",
      sender: "bot",
      type: "text",
    },
  ]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (trimmedInput.toLowerCase() === SECRET_PHRASE) {
      setInput("");
      router.push("/(vault)/lock-screen");
      return;
    }

    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, text: trimmedInput, sender: "user", type: "text" },
    ]);
    setInput("");
    setIsLoading(true);

    // Add temporary loading message
    setMessages((prev) => [
      ...prev,
      {
        id: "loading",
        text: "Generating quiz... 🧠",
        sender: "bot",
        type: "text",
      },
    ]);

    try {
      const quizData = await ApiService.generateQuizFromText(trimmedInput);

      // Remove loading message and add result
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: Date.now(),
          text: "I've generated a quiz based on your text:",
          sender: "bot",
          type: "quiz",
          data: quizData,
        },
      ]);
    } catch (e) {
      // Remove loading message and add error
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: Date.now(),
          text: "Sorry, I couldn't connect to the AI brain. Is the server running?",
          sender: "bot",
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });
      if (result.canceled) return;
      const file = result.assets[0];

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `📄 Uploaded: ${file.name}`,
          sender: "user",
          type: "text",
        },
      ]);
      setIsLoading(true);

      // Add temporary loading message
      setMessages((prev) => [
        ...prev,
        {
          id: "loading",
          text: "Analyzing document... 📄",
          sender: "bot",
          type: "text",
        },
      ]);

      const quizData = await ApiService.uploadPdf(
        file.uri,
        file.name,
        file.mimeType || "application/pdf"
      );

      // Remove loading message and add result
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: Date.now() + 1,
          text: `I analyzed ${file.name}. Here is your quiz:`,
          sender: "bot",
          type: "quiz",
          data: quizData,
        },
      ]);
    } catch (e) {
      // Remove loading message on error (optional, or leave it and show alert)
      setMessages((prev) => prev.filter((m) => m.id !== "loading"));
      Alert.alert("Upload Failed", "Could not process the PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (quizData: any) => {
    // Save to store to avoid param size limits
    useAppStore.getState().setCurrentQuiz(quizData);
    router.push("/(decoy)/quiz");
  };

  const renderMessage = ({ item }: { item: any }) => {
    if (item.type === "quiz" && item.data) {
      const mcqCount = item.data.mcqs?.length || 0;
      const shortCount = item.data.short_answer?.length || 0;

      return (
        <View
          style={[styles.messageBubble, styles.botBubble, { width: "85%" }]}
        >
          <Text style={styles.botTextTitle}>🎯 Quiz Generated</Text>
          <Text style={styles.botText}>
            • {mcqCount} Multiple Choice Questions
          </Text>
          <Text style={styles.botText}>
            • {shortCount} Short Answer Questions
          </Text>
          <TouchableOpacity
            style={styles.quizButton}
            onPress={() => handleStartQuiz(item.data)} // <--- LINKED HERE
          >
            <Text style={styles.quizButtonText}>Start Quiz</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          item.sender === "user" ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === "user" ? styles.userText : styles.botText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text style={styles.headerTitle}>🎓 QuizMaster AI</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading ? "Brainstorming..." : "Online & Ready"}
            </Text>
          </View>
          <TouchableOpacity>
            <MoreVertical color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20 }}
          style={{ flex: 1 }}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              onPress={handleUpload}
              style={styles.attachButton}
            >
              <Paperclip size={20} color="#6B7280" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />

            <TouchableOpacity
              onPress={handleSend}
              style={styles.sendButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Send size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "#DBEAFE", marginTop: 2 },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: "80%",
  },
  botBubble: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    alignSelf: "flex-end",
    borderTopRightRadius: 4,
  },
  messageText: { fontSize: 16, lineHeight: 24 },
  botTextTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  botText: { color: "#374151", fontSize: 14, marginBottom: 4 },
  userText: { color: "#FFF" },
  quizButton: {
    marginTop: 12,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  quizButtonText: { color: "#FFF", fontWeight: "bold" },
  inputContainer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachButton: { padding: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

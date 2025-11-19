import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../context/AuthContext";
import { SERVICE_URL } from "@env";

type ChatScreenProps = StackScreenProps<RootStackParamList, "Chat">;

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

interface Suggestion {
  type: "goal" | "event";
  text: string;
  context: string;
}

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    type: "goal" | "event";
    text: string;
    context: string;
  } | null>(null);
  const [shouldGenerateSuggestion, setShouldGenerateSuggestion] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load conversation history on screen mount
  useEffect(() => {
    loadConversationHistory();
  }, [user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Use setTimeout to ensure the list has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  // Generate AI suggestions based on recent chat context
  useEffect(() => {
    const generateSuggestion = async () => {
      try {
        if (!user?.id) {
          console.log('⚠️ No user ID for suggestion');
          return;
        }
        
        const token = await AsyncStorage.getItem("@user_token");
        if (!token) {
          console.log('⚠️ No token for suggestion');
          return;
        }

        console.log(`🔍 Fetching suggestion for user ${user.id}...`);

        // Call backend suggestion endpoint
        const url = `${SERVICE_URL}/api/chat/suggestion/${user.id}`;
        console.log(`📍 Full URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log('📦 Suggestion response:', data);
        
        if (data.success && data.data?.suggestion) {
          console.log('✨ Got suggestion:', data.data.suggestion);
          setSuggestion(data.data.suggestion);
        } else {
          console.log('💭 No suggestion generated');
          setSuggestion(null);
        }
      } catch (error) {
        console.error("❌ Error generating suggestion:", error);
        setSuggestion(null);
      } finally {
        setShouldGenerateSuggestion(false);
      }
    };

    // Only generate suggestion if flag is set (meaning user sent a new message)
    if (shouldGenerateSuggestion) {
      const timer = setTimeout(() => {
        generateSuggestion();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [shouldGenerateSuggestion, user?.id]);

  const handleAddSuggestion = async (suggestion: Suggestion) => {
    try {
      if (!user?.id) return;

      const endpoint =
        suggestion.type === "goal" ? "/api/goals" : "/api/calendar";
      const payload =
        suggestion.type === "goal"
          ? {
              userId: user.id,
              text: suggestion.text.replace("Add Goal: ", "").replace("?", ""),
              category: "AI Suggested",
              priority: "medium",
            }
          : {
              userId: user.id,
              title: suggestion.text
                .replace("Schedule: ", "")
                .replace("?", ""),
              type: "AI Suggested",
              date: (suggestion as any).eventDate,
              time: (suggestion as any).eventTime,
            };

      const response = await fetch(`${SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await AsyncStorage.getItem("@user_token"))!}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Show success and clear suggestion
        setSuggestion(null);
        console.log(
          `${suggestion.type === "goal" ? "Goal" : "Event"} added successfully!`
        );
      }
    } catch (error) {
      console.error("Error adding suggestion:", error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        console.error("User ID not available");
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem("@user_token");
      if (!token) {
        console.error("Auth token not found");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${SERVICE_URL}/api/chat/history/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        // Convert server messages to chat format using the role field
        console.log("Raw messages from server:", data.data);
        const formattedMessages: Message[] = data.data.map(
          (msg: any) => {
            const sender = msg.role === "assistant" ? "bot" : "user";
            console.log(`Message ID: ${msg.id}, Role: ${msg.role}, Sender: ${sender}, Text: ${msg.text.substring(0, 50)}...`);
            return {
              id: msg.id || String(msg.createdAt),
              text: msg.text,
              sender: sender, // Use role field instead of alternating
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          }
        );
        setMessages(formattedMessages);
        setIsLoading(false);
      } else {
        // No conversation history - fetch onboarding prompt from backend
        await fetchOnboardingPrompt(token);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      // On error, try to fetch onboarding prompt
      const token = await AsyncStorage.getItem("@user_token");
      if (token) {
        await fetchOnboardingPrompt(token);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    }
  };

  const fetchOnboardingPrompt = async (token: string) => {
    try {
      if (!user?.id) {
        console.error("User ID not available for onboarding fetch");
        return;
      }

      console.log("Fetching onboarding prompt...");

      // Call generateChatResponse with empty message to get onboarding prompt
      const response = await fetch(`${SERVICE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: "" }), // Empty message triggers onboarding
      });

      const data = await response.json();
      console.log("Onboarding response:", data);

      if (data.success && data.data && data.data.aiResponse) {
        // Display the onboarding prompt from backend
        const onboardingMessage: Message = {
          id: data.data.aiResponse.id || String(Date.now()),
          text: data.data.aiResponse.text || "",
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        console.log("Setting onboarding message:", onboardingMessage);
        setMessages([onboardingMessage]);
      } else {
        console.error("Failed to fetch onboarding prompt:", data.error);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching onboarding prompt:", error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.id) return;

    const userMessageText = inputText;
    setInputText("");

    // Add user message to UI immediately
    const userMessage: Message = {
      id: String(Date.now()),
      text: userMessageText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem("@user_token");
      if (!token) {
        console.error("Auth token not found");
        setIsSending(false);
        return;
      }

      // Send message to backend
      const response = await fetch(`${SERVICE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessageText }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Add AI response to UI
        const aiMessage: Message = {
          id: data.data.aiResponse.id || String(Date.now() + 1),
          text: data.data.aiResponse.text,
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, aiMessage]);
        
        // Trigger suggestion generation only after new message is sent
        setShouldGenerateSuggestion(true);
      } else {
        console.error("Failed to get AI response:", data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === "user"
          ? styles.userMessageContainer
          : styles.botMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === "user"
            ? styles.userBubble
            : styles.botBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
      <Text style={styles.timestamp}>{item.timestamp}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.wrapper}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chat</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          scrollEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Start a conversation by sending a message</Text>
            </View>
          }
          onContentSizeChange={() => {
            // scrollToEnd is now handled by useEffect with messages dependency
          }}
        />

        {/* Suggestion Card */}
        {suggestion && (
          <View style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionBadge}>
                {suggestion.type === "goal" ? "💡 Goal" : "📅 Event"}
              </Text>
              <TouchableOpacity
                onPress={() => setSuggestion(null)}
                style={styles.suggestionDismiss}
              >
                <Text style={styles.suggestionDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.suggestionText}>{suggestion.text}</Text>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={[styles.suggestionButton, styles.suggestionAddButton]}
                onPress={() => handleAddSuggestion(suggestion)}
              >
                <Text style={styles.suggestionButtonText}>
                  {suggestion.type === "goal" ? "Add Goal" : "Schedule Event"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    color: "#0066cc",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  botMessageContainer: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#0066cc",
  },
  botBubble: {
    backgroundColor: "#1a1a1a",
  },
  messageText: {
    fontSize: 15,
    color: "#fff",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginHorizontal: 8,
  },
  inputArea: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    gap: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#0066cc",
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  suggestionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestionBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0066cc",
  },
  suggestionDismiss: {
    padding: 4,
  },
  suggestionDismissText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  suggestionText: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 10,
    fontWeight: "500",
  },
  suggestionActions: {
    flexDirection: "row",
    gap: 8,
  },
  suggestionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionAddButton: {
    backgroundColor: "#0066cc",
  },
  suggestionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});

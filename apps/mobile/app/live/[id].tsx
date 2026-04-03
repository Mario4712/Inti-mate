import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, FlatList, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/src/lib/api";

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  amount?: number;
  color?: string;
}

export default function LiveViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    joinLive();
  }, [id]);

  async function joinLive() {
    try {
      const { data } = await api.post(`/lives/${id}/join`);
      setToken(data.token);
      setViewerCount(data.viewerCount ?? 0);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Nao foi possivel entrar na live";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendSuperChat(amount: number) {
    if (!chatInput.trim()) {
      return Alert.alert("Digite uma mensagem para o Super Chat");
    }
    try {
      const { data } = await api.post(`/lives/${id}/super-chat`, {
        amount,
        message: chatInput.trim(),
      });
      setChatMessages((prev) => [
        {
          id: `sc-${Date.now()}`,
          senderName: "Voce",
          content: chatInput.trim(),
          amount,
          color: data.color,
        },
        ...prev,
      ]);
      setChatInput("");
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message ?? "Tente novamente");
    }
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      {
        id: `msg-${Date.now()}`,
        senderName: "Voce",
        content: chatInput.trim(),
      },
      ...prev,
    ]);
    setChatInput("");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" size="large" />
        <Text style={styles.loadingText}>Entrando na live...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Video area */}
      <View style={styles.videoArea}>
        <Text style={styles.videoPlaceholder}>
          {token ? "Transmissao ao vivo" : "Conectando..."}
        </Text>
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerText}>{viewerCount} assistindo</Text>
        </View>
      </View>

      {/* Chat */}
      <FlatList
        style={styles.chat}
        data={chatMessages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.chatRow, item.amount ? { backgroundColor: item.color ?? "#1a1a3a" } : undefined]}>
            <Text style={styles.chatSender}>{item.senderName}</Text>
            {item.amount && (
              <Text style={styles.chatAmount}>R$ {item.amount.toFixed(2)}</Text>
            )}
            <Text style={styles.chatContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.chatEmpty}>Seja o primeiro a comentar!</Text>
        }
      />

      {/* Input + Super Chat */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Enviar mensagem..."
          placeholderTextColor="#555"
          value={chatInput}
          onChangeText={setChatInput}
          maxLength={200}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendChat}>
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.superChatBar}>
        {[2, 10, 50, 100].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.superChatBtn}
            onPress={() => sendSuperChat(amount)}
          >
            <Text style={styles.superChatBtnText}>
              R${amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#0a0a0a" },
  center:           { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  loadingText:      { color: "#888", marginTop: 12, fontSize: 14 },
  errorText:        { color: "#ff4444", fontSize: 15, textAlign: "center", padding: 20 },
  videoArea:        { height: 220, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  videoPlaceholder: { color: "#555", fontSize: 16 },
  viewerBadge:      { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  viewerText:       { color: "#e91e8c", fontSize: 12, fontWeight: "600" },
  chat:             { flex: 1, paddingHorizontal: 12 },
  chatRow:          { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  chatSender:       { color: "#e91e8c", fontSize: 12, fontWeight: "700" },
  chatAmount:       { color: "#ffd700", fontSize: 11, fontWeight: "700" },
  chatContent:      { color: "#ddd", fontSize: 13 },
  chatEmpty:        { color: "#555", textAlign: "center", marginTop: 40, fontSize: 13 },
  inputBar:         { flexDirection: "row", padding: 8, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  chatInput:        { flex: 1, backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  sendBtn:          { backgroundColor: "#e91e8c", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center", marginLeft: 8 },
  sendBtnText:      { color: "#fff", fontWeight: "600", fontSize: 14 },
  superChatBar:     { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  superChatBtn:     { backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#e91e8c", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  superChatBtnText: { color: "#e91e8c", fontSize: 12, fontWeight: "700" },
});

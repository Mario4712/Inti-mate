import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import { api } from "@/src/lib/api";

async function fetchConversations() {
  const { data } = await api.get("/messages/conversations");
  return data.items ?? data;
}

export default function MessagesScreen() {
  const { data, isLoading } = useQuery("conversations", fetchConversations, {
    refetchInterval: 15_000, // poll a cada 15s
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item: any) => item.id}
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/conversation/${item.id}`)}
        >
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.initial}>
              {(item.otherUser?.artisticName ?? "?")[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.otherUser?.artisticName ?? "—"}</Text>
            {item.lastMessage && (
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage.content}
              </Text>
            )}
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>Nenhuma conversa ainda</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0a0a0a" },
  center:      { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  row:         { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", alignItems: "center" },
  avatar:      { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  placeholder: { backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  initial:     { color: "#e91e8c", fontSize: 18, fontWeight: "700" },
  name:        { color: "#fff", fontSize: 15, fontWeight: "600" },
  preview:     { color: "#666", fontSize: 13, marginTop: 2 },
  badge:       { backgroundColor: "#e91e8c", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 5 },
  badgeText:   { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty:       { color: "#555", textAlign: "center", marginTop: 60, fontSize: 14 },
});

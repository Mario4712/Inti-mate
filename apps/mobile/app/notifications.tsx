import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { router } from "expo-router";
import { api } from "@/src/lib/api";

async function fetchNotifications(page: number) {
  const { data } = await api.get("/notifications", { params: { page, limit: 30 } });
  return data;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery(
    "notifications",
    () => fetchNotifications(1),
  );

  const markAllRead = useMutation(
    () => api.put("/notifications/read-all"),
    {
      onSuccess: () => queryClient.invalidateQueries("notifications"),
    },
  );

  const markRead = useMutation(
    (id: string) => api.put(`/notifications/${id}/read`),
    {
      onSuccess: () => queryClient.invalidateQueries("notifications"),
    },
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" size="large" />
      </View>
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  return (
    <View style={styles.container}>
      {unread > 0 && (
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => markAllRead.mutate()}
        >
          <Text style={styles.markAllText}>
            Marcar todas como lidas ({unread})
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#e91e8c"
          />
        }
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={[styles.row, !item.readAt && styles.rowUnread]}
            onPress={() => {
              if (!item.readAt) markRead.mutate(item.id);
              if (item.link) router.push(item.link);
            }}
          >
            <View style={[styles.dot, !item.readAt && styles.dotActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              {item.body && (
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              )}
              <Text style={styles.time}>
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma notificacao</Text>
        }
      />
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0a0a0a" },
  center:       { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  markAllBtn:   { backgroundColor: "#1a1a1a", padding: 12, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
  markAllText:  { color: "#e91e8c", fontWeight: "600", fontSize: 14 },
  row:          { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", alignItems: "flex-start" },
  rowUnread:    { backgroundColor: "#0f0f1a" },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: "#333", marginRight: 12, marginTop: 6 },
  dotActive:    { backgroundColor: "#e91e8c" },
  title:        { color: "#fff", fontSize: 14, fontWeight: "600" },
  body:         { color: "#888", fontSize: 13, marginTop: 4 },
  time:         { color: "#555", fontSize: 11, marginTop: 4 },
  empty:        { color: "#555", textAlign: "center", marginTop: 60, fontSize: 14 },
});

import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import { api } from "@/src/lib/api";
import { cacheTeaser } from "@/src/lib/offline";

interface RecommendedCreator {
  id:           string;
  artisticName: string;
  avatarUrl:    string | null;
  category:     string | null;
  score:        number;
  reason:       string;
}

async function fetchRecommendations(): Promise<RecommendedCreator[]> {
  const { data } = await api.get("/recommendations?limit=20&withExplanations=true");
  return data.items;
}

export default function HomeScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery(
    "recommendations",
    fetchRecommendations,
    { staleTime: 5 * 60_000 },
  );

  // Pré-cacheia teasers em background
  useEffect(() => {
    if (!data) return;
    data.forEach((creator) => {
      if (creator.avatarUrl) {
        cacheTeaser(creator.id, creator.avatarUrl).catch(() => {});
      }
    });
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#e91e8c"
        />
      }
      ListHeaderComponent={
        <Text style={styles.header}>Para você</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/creator/${item.id}`)}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {item.artisticName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.artisticName}</Text>
            {item.category && (
              <Text style={styles.category}>{item.category}</Text>
            )}
            {item.reason && (
              <Text style={styles.reason}>{item.reason}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#0a0a0a" },
  center:            { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  header:            { color: "#fff", fontSize: 22, fontWeight: "700", padding: 16 },
  card:              { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar:            { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:     { color: "#e91e8c", fontSize: 22, fontWeight: "700" },
  info:              { flex: 1, justifyContent: "center" },
  name:              { color: "#fff", fontSize: 16, fontWeight: "600" },
  category:          { color: "#888", fontSize: 12, marginTop: 2 },
  reason:            { color: "#555", fontSize: 11, marginTop: 4, fontStyle: "italic" },
});

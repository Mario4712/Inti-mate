import { useState } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet,
  Image, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import { api } from "@/src/lib/api";

async function searchCreators(q: string) {
  if (!q) return [];
  const { data } = await api.get("/search/creators", { params: { q, limit: 30 } });
  return data.items ?? data;
}

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const { data, isLoading } = useQuery(
    ["search", debouncedQ],
    () => searchCreators(debouncedQ),
    { enabled: debouncedQ.length >= 2, staleTime: 30_000 },
  );

  function onChangeText(text: string) {
    setQuery(text);
    clearTimeout((onChangeText as any)._timer);
    (onChangeText as any)._timer = setTimeout(() => setDebouncedQ(text), 400);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar criadores, categorias..."
        placeholderTextColor="#555"
        value={query}
        onChangeText={onChangeText}
        returnKeyType="search"
      />

      {isLoading && debouncedQ.length >= 2 && (
        <ActivityIndicator color="#e91e8c" style={{ marginTop: 20 }} />
      )}

      <FlatList
        data={data ?? []}
        keyExtractor={(item: any) => item.id ?? item.userId}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={styles.result}
            onPress={() => router.push(`/creator/${item.id ?? item.userId}`)}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholder]}>
                <Text style={styles.initial}>
                  {(item.artisticName ?? "?")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.artisticName}</Text>
              {item.category && <Text style={styles.category}>{item.category}</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          debouncedQ.length >= 2 && !isLoading
            ? <Text style={styles.empty}>Nenhum resultado para "{debouncedQ}"</Text>
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0a0a0a" },
  searchBar:   { backgroundColor: "#1a1a1a", color: "#fff", margin: 12, borderRadius: 10, padding: 12, fontSize: 15 },
  result:      { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar:      { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  placeholder: { backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  initial:     { color: "#e91e8c", fontSize: 18, fontWeight: "700" },
  name:        { color: "#fff", fontSize: 15, fontWeight: "600" },
  category:    { color: "#888", fontSize: 12, marginTop: 2 },
  empty:       { color: "#555", textAlign: "center", marginTop: 40, fontSize: 14 },
});

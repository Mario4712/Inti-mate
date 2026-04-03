import { useState } from "react";
import {
  View, Text, StyleSheet, Image, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "@/src/lib/api";

async function fetchCreator(id: string) {
  const { data } = await api.get(`/users/${id}/profile`);
  return data;
}

async function fetchGallery(creatorId: string, page: number) {
  const { data } = await api.get(`/content/${creatorId}/gallery`, {
    params: { page, limit: 20 },
  });
  return data;
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [galleryPage, setGalleryPage] = useState(1);

  const { data: creator, isLoading } = useQuery(
    ["creator", id],
    () => fetchCreator(id!),
    { enabled: !!id },
  );

  const { data: gallery } = useQuery(
    ["gallery", id, galleryPage],
    () => fetchGallery(id!, galleryPage),
    { enabled: !!id },
  );

  const subscribeMutation = useMutation(
    async () => {
      const { data } = await api.post(`/subscriptions`, { creatorId: id });
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["creator", id]);
        queryClient.invalidateQueries(["gallery", id]);
        Alert.alert("Inscrito!", "Agora voce tem acesso ao conteudo exclusivo.");
      },
      onError: (err: any) => {
        Alert.alert("Erro", err?.response?.data?.message ?? "Tente novamente");
      },
    },
  );

  if (isLoading || !creator) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" size="large" />
      </View>
    );
  }

  const profile = creator.profile ?? creator;

  return (
    <FlatList
      style={styles.container}
      data={gallery?.items ?? []}
      keyExtractor={(item: any) => item.id}
      numColumns={3}
      ListHeaderComponent={
        <View style={styles.header}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(profile.artisticName ?? "?")[0]?.toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.name}>{profile.artisticName ?? "Criador"}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{profile.subscriberCount ?? 0}</Text>
              <Text style={styles.statLabel}>Inscritos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{profile.mediaCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {!gallery?.hasAccess && (
            <TouchableOpacity
              style={styles.subscribeBtn}
              onPress={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isLoading}
            >
              {subscribeMutation.isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  Assinar — R$ {((profile.subscriptionPrice ?? 0) / 100).toFixed(2)}/mes
                </Text>
              )}
            </TouchableOpacity>
          )}

          {gallery?.hasAccess && (
            <View style={styles.subscribedBadge}>
              <Text style={styles.subscribedText}>Inscrito</Text>
            </View>
          )}

          <Text style={styles.galleryTitle}>Conteudo</Text>
        </View>
      }
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => router.push(`/media/${item.id}`)}
        >
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.gridImage} />
          ) : (
            <View style={[styles.gridImage, styles.gridPlaceholder]}>
              <Text style={styles.gridIcon}>
                {item.type === "VIDEO" ? "▶" : "◻"}
              </Text>
            </View>
          )}
          {item.visibility === "SUBSCRIBERS" && !gallery?.hasAccess && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      onEndReached={() => {
        if (gallery?.pagination?.page < gallery?.pagination?.pages) {
          setGalleryPage((p) => p + 1);
        }
      }}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#0a0a0a" },
  center:            { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  header:            { alignItems: "center", padding: 20 },
  avatar:            { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:     { color: "#e91e8c", fontSize: 36, fontWeight: "700" },
  name:              { color: "#fff", fontSize: 22, fontWeight: "700" },
  bio:               { color: "#888", fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  stats:             { flexDirection: "row", marginTop: 16, gap: 32 },
  stat:              { alignItems: "center" },
  statNum:           { color: "#fff", fontSize: 18, fontWeight: "700" },
  statLabel:         { color: "#888", fontSize: 12, marginTop: 2 },
  subscribeBtn:      { backgroundColor: "#e91e8c", borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 },
  subscribeBtnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  subscribedBadge:   { borderWidth: 1, borderColor: "#e91e8c", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginTop: 20 },
  subscribedText:    { color: "#e91e8c", fontWeight: "600" },
  galleryTitle:      { color: "#fff", fontSize: 16, fontWeight: "600", alignSelf: "flex-start", marginTop: 24 },
  gridItem:          { flex: 1 / 3, aspectRatio: 1, padding: 1 },
  gridImage:         { flex: 1, borderRadius: 4 },
  gridPlaceholder:   { backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" },
  gridIcon:          { color: "#555", fontSize: 24 },
  lockOverlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", borderRadius: 4 },
  lockIcon:          { fontSize: 20 },
});

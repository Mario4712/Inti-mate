import {
  View, Text, StyleSheet, Image,
  ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "react-query";
import { api } from "@/src/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

async function fetchMedia(id: string) {
  const { data } = await api.get(`/content/${id}`);
  return data;
}

export default function MediaViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: media, isLoading, error } = useQuery(
    ["media", id],
    () => fetchMedia(id!),
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e91e8c" size="large" />
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Conteudo nao encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {media.type === "PHOTO" && media.processedUrl && (
        <Image
          source={{ uri: media.processedUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      {media.type === "VIDEO" && (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoText}>Video Player</Text>
          <Text style={styles.videoUrl} numberOfLines={1}>
            {media.processedUrl}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        {media.title && <Text style={styles.title}>{media.title}</Text>}
        {media.description && (
          <Text style={styles.description}>{media.description}</Text>
        )}

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {media.viewCount ?? 0} visualizacoes
          </Text>
          <Text style={styles.metaText}>
            {formatDate(media.createdAt)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#0a0a0a" },
  center:           { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  errorText:        { color: "#ff4444", fontSize: 15 },
  image:            { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: "#111" },
  videoPlaceholder: { width: SCREEN_WIDTH, height: 220, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  videoText:        { color: "#555", fontSize: 16 },
  videoUrl:         { color: "#333", fontSize: 10, marginTop: 8, paddingHorizontal: 20 },
  info:             { padding: 16 },
  title:            { color: "#fff", fontSize: 18, fontWeight: "700" },
  description:      { color: "#888", fontSize: 14, marginTop: 8 },
  meta:             { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  metaText:         { color: "#555", fontSize: 12 },
});

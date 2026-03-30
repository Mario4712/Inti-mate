import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Switch,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import {
  clearTokens, isBiometricAvailable,
  isBiometricLoginEnabled, setBiometricLoginEnabled, logout,
} from "@/src/lib/auth";
import * as SecureStore from "expo-secure-store";
import { api } from "@/src/lib/api";
import { clearTeaserCache, getTeaserCacheSize } from "@/src/lib/offline";

async function fetchMe() {
  const { data } = await api.get("/users/me");
  return data;
}

export default function ProfileScreen() {
  const { data: user } = useQuery("me", fetchMe);
  const [bioEnabled, setBioEnabled] = useState<boolean | null>(null);
  const [cacheSize,  setCacheSize]  = useState<number | null>(null);

  // Carrega estado biométrico e cache
  useState(() => {
    isBiometricLoginEnabled().then(setBioEnabled);
    getTeaserCacheSize().then(setCacheSize);
  });

  async function toggleBiometric(value: boolean) {
    const available = await isBiometricAvailable();
    if (value && !available) {
      Alert.alert("Biometria não disponível neste dispositivo");
      return;
    }
    await setBiometricLoginEnabled(value);
    setBioEnabled(value);
  }

  async function handleLogout() {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          const refreshToken = await SecureStore.getItemAsync("refresh_token");
          if (refreshToken) await logout(refreshToken);
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  async function handleClearCache() {
    await clearTeaserCache();
    setCacheSize(0);
    Alert.alert("Cache limpo");
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {user?.profile?.artisticName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.profile?.artisticName ?? user?.email ?? "Carregando..."}</Text>
        <Text style={styles.username}>@{user?.username ?? "—"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Segurança</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Login biométrico</Text>
          <Switch
            value={bioEnabled ?? false}
            onValueChange={toggleBiometric}
            trackColor={{ true: "#e91e8c", false: "#333" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Armazenamento</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cache offline</Text>
          <Text style={styles.rowValue}>
            {cacheSize !== null ? `${(cacheSize / 1024 / 1024).toFixed(1)} MB` : "—"}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleClearCache}>
          <Text style={styles.buttonText}>Limpar cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, { color: "#ff4444" }]}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#0a0a0a" },
  header:            { alignItems: "center", padding: 24 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarInitial:     { color: "#e91e8c", fontSize: 32, fontWeight: "700" },
  name:              { color: "#fff", fontSize: 20, fontWeight: "700" },
  username:          { color: "#888", fontSize: 14, marginTop: 4 },
  section:           { marginTop: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle:      { color: "#888", fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  row:               { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  rowLabel:          { color: "#fff", fontSize: 15 },
  rowValue:          { color: "#888", fontSize: 14 },
  button:            { backgroundColor: "#1a1a1a", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  buttonText:        { color: "#fff", fontWeight: "600" },
  buttonDanger:      { borderWidth: 1, borderColor: "#ff4444", backgroundColor: "transparent" },
});

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { register, login, saveTokens, isBiometricAvailable, setBiometricLoginEnabled } from "@/src/lib/auth";

export default function RegisterScreen() {
  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleRegister() {
    if (!email || !username || !password) {
      return Alert.alert("Preencha todos os campos");
    }
    if (password !== confirm) {
      return Alert.alert("Senhas não coincidem");
    }
    if (password.length < 8) {
      return Alert.alert("Senha deve ter pelo menos 8 caracteres");
    }

    setLoading(true);
    try {
      await register(email, password, username);

      // Login automático após registro
      const tokens = await login(email, password);
      await saveTokens(tokens);

      // Oferece ativar biometria se disponível
      const bioAvailable = await isBiometricAvailable();
      if (bioAvailable) {
        Alert.alert(
          "Ativar login biométrico?",
          "Use Face ID / impressão digital para entrar mais rápido",
          [
            {
              text: "Ativar",
              onPress: async () => {
                await setBiometricLoginEnabled(true);
                router.replace("/(tabs)");
              },
            },
            { text: "Agora não", onPress: () => router.replace("/(tabs)") },
          ],
        );
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(
        "Erro no cadastro",
        err?.response?.data?.message ?? "Tente novamente",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Criar conta</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Nome de usuário (@handle)"
          placeholderTextColor="#666"
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha (mín. 8 caracteres)"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar senha"
          placeholderTextColor="#666"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Criar conta</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Já tenho conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flexGrow: 1, backgroundColor: "#0a0a0a", justifyContent: "center", padding: 24 },
  title:          { color: "#fff", fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 32 },
  input:          { backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15 },
  button:         { backgroundColor: "#e91e8c", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: "#fff", fontWeight: "600", fontSize: 16 },
  link:           { color: "#888", textAlign: "center", marginTop: 20, fontSize: 14 },
});

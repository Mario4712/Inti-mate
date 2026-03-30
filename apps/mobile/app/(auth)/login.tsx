import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import {
  login, saveTokens, isBiometricAvailable,
  isBiometricLoginEnabled, authenticateWithBiometrics, getAccessToken,
} from "@/src/lib/auth";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showBio,  setShowBio]  = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const hasToken    = !!(await getAccessToken());
    const bioEnabled  = await isBiometricLoginEnabled();
    const bioAvailable = await isBiometricAvailable();
    setShowBio(hasToken && bioEnabled && bioAvailable);
  }

  async function handleBiometricLogin() {
    const ok = await authenticateWithBiometrics();
    if (ok) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Falha na autenticação biométrica");
    }
  }

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const tokens = await login(email, password);
      await saveTokens(tokens);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(
        "Erro ao entrar",
        err?.response?.data?.message ?? "Verifique seu e-mail e senha",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>Inti.mate</Text>
      <Text style={styles.subtitle}>Sua plataforma de criadores</Text>

      {showBio && (
        <TouchableOpacity style={styles.bioButton} onPress={handleBiometricLogin}>
          <Text style={styles.bioButtonText}>Entrar com biometria</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Entrar</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", padding: 24 },
  logo:            { color: "#e91e8c", fontSize: 36, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle:        { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 32 },
  input:           { backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15 },
  button:          { backgroundColor: "#e91e8c", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled:  { opacity: 0.6 },
  buttonText:      { color: "#fff", fontWeight: "600", fontSize: 16 },
  bioButton:       { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#e91e8c" },
  bioButtonText:   { color: "#e91e8c", fontWeight: "600", fontSize: 15 },
  link:            { color: "#888", textAlign: "center", marginTop: 20, fontSize: 14 },
});

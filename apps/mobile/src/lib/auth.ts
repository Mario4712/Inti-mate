import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

// ─── Biometria ───────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled   = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:     "Confirme sua identidade para acessar o Inti.mate",
    fallbackLabel:     "Usar senha",
    disableDeviceFallback: false,
  });
  return result.success;
}

// ─── Sessão ───────────────────────────────────────────────

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export async function saveTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync("access_token",  tokens.accessToken);
  await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync("access_token");
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync("biometric_enabled")) === "true";
}

export async function setBiometricLoginEnabled(enabled: boolean) {
  await SecureStore.setItemAsync("biometric_enabled", enabled ? "true" : "false");
}

// ─── Auth API ────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/login", { email, password });
  return data;
}

export async function register(email: string, password: string, username: string) {
  const { data } = await api.post("/auth/register", { email, password, username });
  return data;
}

export async function logout(refreshToken: string) {
  await api.post("/auth/logout", { refreshToken }).catch(() => {});
  await clearTokens();
}

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Push notifications nativas (APNs + FCM)
 *
 * Fluxo:
 * 1. Solicita permissão ao usuário
 * 2. Obtém Expo Push Token (encapsula APNs / FCM token)
 * 3. Registra no servidor via POST /notifications/device-token
 *
 * O servidor usa o token para enviar notificações via Expo Push API,
 * que entrega para APNs (iOS) e FCM (Android) automaticamente.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications só funcionam em dispositivos físicos");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android: canal obrigatório
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name:       "Inti.mate",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#e91e8c",
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Registra no servidor
  try {
    await api.post("/notifications/device-token", {
      token,
      platform: Platform.OS,
    });
  } catch (err) {
    console.warn("Falha ao registrar push token:", err);
  }

  return token;
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

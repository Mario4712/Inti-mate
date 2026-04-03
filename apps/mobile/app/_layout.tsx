import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "react-query";
import { registerForPushNotifications, addResponseListener } from "@/src/lib/notifications";
import { router } from "expo-router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // Registra push ao abrir o app
    registerForPushNotifications();

    // Deep link ao tocar numa notificação
    const sub = addResponseListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.route) {
        router.push(data.route);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle:      { backgroundColor: "#0a0a0a" },
              headerTintColor:  "#ffffff",
              contentStyle:     { backgroundColor: "#0a0a0a" },
            }}
          >
            <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
            <Stack.Screen name="creator/[id]" options={{ title: "Perfil" }} />
            <Stack.Screen name="media/[id]"   options={{ title: "Conteudo" }} />
            <Stack.Screen name="live/[id]"    options={{ title: "Ao Vivo" }} />
            <Stack.Screen name="notifications" options={{ title: "Notificacoes" }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor:  "#1a1a1a",
          height: Platform.OS === "ios" ? 85 : 60,
        },
        tabBarActiveTintColor:   "#e91e8c",
        tabBarInactiveTintColor: "#555",
        headerStyle:      { backgroundColor: "#0a0a0a" },
        headerTintColor:  "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:        "Início",
          tabBarIcon:   ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title:       "Descobrir",
          tabBarIcon:  ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title:      "Mensagens",
          tabBarIcon: ({ color }) => <TabIcon name="message" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:      "Perfil",
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Ícone stub (substituir por @expo/vector-icons em prod)
function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: "⌂", search: "⌕", message: "✉", person: "◉",
  };
  const { Text } = require("react-native");
  return <Text style={{ color, fontSize: 20 }}>{icons[name] ?? "○"}</Text>;
}

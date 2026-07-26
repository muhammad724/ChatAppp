import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/auth";
import { colors, fonts } from "@/theme";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_300Light: require("@expo-google-fonts/poppins/300Light/Poppins_300Light.ttf"),
    Poppins_400Regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    Poppins_500Medium: require("@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf"),
    Poppins_600SemiBold: require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf")
  });
  if (!loaded) return null;
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 19 },
        contentStyle: { backgroundColor: colors.background }
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: "Create your profile", headerBackVisible: false }} />
        <Stack.Screen name="home" options={{ title: "Convo", headerBackVisible: false }} />
        <Stack.Screen name="search" options={{ title: "New conversation" }} />
        <Stack.Screen name="dashboard" options={{ title: "Account", headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Conversation" }} />
      </Stack>
    </AuthProvider>
  );
}

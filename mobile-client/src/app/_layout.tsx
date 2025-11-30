import { useAppStore } from "@/store/useAppStore";
import { Stack, useRouter, useSegments } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture"; // <--- Import
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import "../polyfills"; // Must be first

export default function RootLayout() {
  usePreventScreenCapture(); // <--- Prevent screenshots/recents snapshot
  const router = useRouter();
  const segments = useSegments();
  const lockVault = useAppStore((state) => state.lockVault);

  const [isPrivacyMode, setIsPrivacyMode] = React.useState(false);

  useEffect(() => {
    // Listen for app state changes (Active -> Background -> Active)
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // Update privacy mode immediately
        setIsPrivacyMode(nextAppState !== "active");

        if (nextAppState === "background" || nextAppState === "inactive") {
          // If we are picking media, DON'T lock
          // Use getState() to avoid stale closure in useEffect
          if (useAppStore.getState().isInteractionActive) {
            console.log(
              "⚠️ App backgrounded but interaction active. NOT locking."
            );
            return;
          }

          // 1. Lock the store state
          lockVault();

          // 2. Check if we are currently inside the Vault
          // segments is an array of the current route path, e.g., ['(vault)', 'dashboard']
          const inVault = segments[0] === "(vault)";

          if (inVault) {
            console.log("🔒 App backgrounded. Locking Vault.");
            // 3. Force navigation back to Decoy
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace("/(decoy)");
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [segments]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(decoy)" />
        <Stack.Screen name="(vault)" />
      </Stack>

      {/* Privacy Overlay */}
      {isPrivacyMode && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#111827", // Dark background
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          {/* Optional: Add an icon or logo */}
        </View>
      )}
    </View>
  );
}

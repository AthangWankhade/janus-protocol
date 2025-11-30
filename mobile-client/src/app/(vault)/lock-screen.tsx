import { BiometricService } from "@/services/biometrics"; // <--- Import Service
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "expo-router";
import { Delete, Fingerprint, Shield } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const CORRECT_PIN = "2608";

export default function LockScreen() {
  const [pin, setPin] = useState("");
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const router = useRouter();
  const unlockVault = useAppStore((state) => state.unlockVault);

  useEffect(() => {
    checkBiometrics();
  }, []);

  // Check hardware and attempt auto-unlock
  const checkBiometrics = async () => {
    const available = await BiometricService.checkAvailability();
    setHasBiometrics(available);

    if (available) {
      const success = await BiometricService.authenticate();
      if (success) {
        handleSuccess();
      }
    }
  };

  const handleSuccess = () => {
    unlockVault();
    // Small delay to prevent jitter
    setTimeout(() => {
      router.replace("/(vault)/dashboard");
    }, 200);
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        handleSuccess();
      } else {
        Vibration.vibrate();
        setPin("");
      }
    }
  }, [pin]);

  const handlePress = (num: string) => {
    if (pin.length < 4) setPin((prev) => prev + num);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Shield size={64} color="#10B981" style={{ marginBottom: 32 }} />
        <Text style={styles.title}>Secure Vault</Text>

        {/* PIN Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotActive]}
            />
          ))}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handlePress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}

          {/* Biometric Button (Bottom Left) */}
          <TouchableOpacity
            style={[styles.key, { backgroundColor: "transparent" }]}
            onPress={checkBiometrics}
            disabled={!hasBiometrics}
          >
            {hasBiometrics && <Fingerprint size={32} color="#10B981" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.key} onPress={() => handlePress("0")}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.key, { backgroundColor: "transparent" }]}
            onPress={handleDelete}
          >
            <Delete size={32} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 40 }}
        >
          <Text style={{ color: "#6B7280" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, color: "#F3F4F6", marginBottom: 40, letterSpacing: 2 },
  dotsContainer: { flexDirection: "row", gap: 16, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#374151" },
  dotActive: { backgroundColor: "#10B981" },
  numpad: {
    width: "80%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { color: "#FFF", fontSize: 28, fontWeight: "600" },
});

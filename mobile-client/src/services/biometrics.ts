import * as LocalAuthentication from "expo-local-authentication";

export const BiometricService = {
  /**
   * Check if the device has FaceID/TouchID set up
   */
  async checkAvailability() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  /**
   * Trigger the system biometric prompt
   */
  async authenticate() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access Vault",
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false, // Allow passcode fallback if biometrics fail
      });
      return result.success;
    } catch (e) {
      console.error("Biometric Auth Failed", e);
      return false;
    }
  },
};

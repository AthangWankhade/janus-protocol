import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Pattern, Rect } from "react-native-svg";

interface PatternBackgroundProps {
  pattern: string;
  children: React.ReactNode;
}

export default function PatternBackground({
  pattern,
  children,
}: PatternBackgroundProps) {
  if (pattern === "none") {
    return <View style={styles.container}>{children}</View>;
  }

  const renderPattern = () => {
    switch (pattern) {
      case "bunny":
        return (
          <Pattern
            id="bunnyPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            <Circle cx="30" cy="35" r="12" fill="#EF4444" opacity={0.4} />
            <Circle cx="22" cy="20" r="6" fill="#EF4444" opacity={0.4} />
            <Circle cx="38" cy="20" r="6" fill="#EF4444" opacity={0.4} />
          </Pattern>
        );
      case "flowers":
        return (
          <Pattern
            id="flowerPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            <Circle cx="30" cy="30" r="8" fill="#F59E0B" opacity={0.5} />
            <Circle cx="30" cy="15" r="6" fill="#10B981" opacity={0.3} />
            <Circle cx="30" cy="45" r="6" fill="#10B981" opacity={0.3} />
            <Circle cx="15" cy="30" r="6" fill="#10B981" opacity={0.3} />
            <Circle cx="45" cy="30" r="6" fill="#10B981" opacity={0.3} />
          </Pattern>
        );
      case "teddy":
        return (
          <Pattern
            id="teddyPattern"
            patternUnits="userSpaceOnUse"
            width={70}
            height={70}
          >
            <Circle cx="35" cy="40" r="14" fill="#8B5CF6" opacity={0.4} />
            <Circle cx="22" cy="25" r="8" fill="#8B5CF6" opacity={0.4} />
            <Circle cx="48" cy="25" r="8" fill="#8B5CF6" opacity={0.4} />
          </Pattern>
        );
      default:
        return null;
    }
  };

  const getPatternId = () => {
    switch (pattern) {
      case "bunny":
        return "url(#bunnyPattern)";
      case "flowers":
        return "url(#flowerPattern)";
      case "teddy":
        return "url(#teddyPattern)";
      default:
        return "none";
    }
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          {renderPattern()}
          <Rect width="100%" height="100%" fill={getPatternId()} />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
});

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Pattern, Rect } from "react-native-svg";

interface PatternBackgroundProps {
  pattern: string;
  children: React.ReactNode;
}

export default function PatternBackground({
  pattern,
  children,
}: PatternBackgroundProps) {
  // Define background colors for each pattern
  const getBackgroundColor = () => {
    switch (pattern) {
      case "teddy":
        return "#FFF8E1"; // Soft Cream/Beige
      case "heart":
        return "#FFF0F5"; // Lavender Blush
      case "bow":
        return "#F3E5F5"; // Purple White
      default:
        return "#F9FAFB"; // Default Gray
    }
  };

  if (pattern === "none") {
    return <View style={styles.container}>{children}</View>;
  }

  const renderPattern = () => {
    switch (pattern) {
      case "teddy":
        return (
          <Pattern
            id="teddyPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            {/* Cute Bear Face */}
            <Path
              d="M15 20 C10 10 5 15 8 20 C5 25 5 35 15 40 C25 45 35 40 45 35 C55 30 55 20 52 15 C55 10 50 5 45 10 C40 5 20 10 15 20 Z"
              fill="#D97706"
              opacity={0.15}
            />
            <Path
              d="M20 25 A2 2 0 1 1 24 25 A2 2 0 1 1 20 25 M36 25 A2 2 0 1 1 40 25 A2 2 0 1 1 36 25"
              fill="#78350F"
              opacity={0.2}
            />
          </Pattern>
        );
      case "heart":
        return (
          <Pattern
            id="heartPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            {/* Heart Shape */}
            <Path
              d="M25 39.7l-.6-.5C11.5 28.7 8 25 8 19c0-5 4-9 9-9 4.1 0 6.4 2.3 8 4.1 1.6-1.8 3.9-4.1 8-4.1 5 0 9 4 9 9 0 6-3.5 9.7-16.4 20.2l-.6.5z"
              fill="#EC4899"
              opacity={0.15}
            />
          </Pattern>
        );
      case "bow":
        return (
          <Pattern
            id="bowPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            {/* Bow Shape */}
            <Path
              d="M30 30 C20 20 10 20 10 30 C10 40 20 40 30 30 C40 40 50 40 50 30 C50 20 40 20 30 30 Z"
              fill="#8B5CF6"
              opacity={0.15}
            />
          </Pattern>
        );
      default:
        return null;
    }
  };

  const getPatternId = () => {
    switch (pattern) {
      case "teddy":
        return "url(#teddyPattern)";
      case "heart":
        return "url(#heartPattern)";
      case "bow":
        return "url(#bowPattern)";
      default:
        return "none";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
  container: { flex: 1 },
});

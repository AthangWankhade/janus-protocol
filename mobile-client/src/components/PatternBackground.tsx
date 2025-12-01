import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from "react-native-svg";

export type PatternType =
  | "teddy"
  | "heart"
  | "bow"
  | "flower"
  | "cloud"
  | "star"
  | "strawberry"
  | "catpaw"
  | "bunny"
  | "frog"
  | "lemon"
  | "cherry"
  | "mushroom"
  | "butterfly"
  | "sparkle"
  | "confidence"
  | "none";

interface PatternBackgroundProps {
  pattern: PatternType;
  children: React.ReactNode;
}

export default function PatternBackground({
  pattern,
  children,
}: PatternBackgroundProps) {
  const getBackgroundColor = () => {
    switch (pattern) {
      case "teddy":
        return "#FFFBEB";
      case "heart":
        return "#FFF1F2";
      case "strawberry":
        return "#FFF5F5";
      case "bunny":
        return "#FDF4FF";

      case "bow":
        return "#F5F3FF";
      case "cloud":
        return "#ECFEFF";
      case "star":
        return "#F6F5F8";
      case "butterfly":
        return "#FAE8FF";
      case "cherry":
        return "#F0F9FF";

      case "flower":
        return "#F0FDF4";
      case "frog":
        return "#DCFCE7";
      case "lemon":
        return "#FEF9C3";
      case "mushroom":
        return "#FFF7ED";
      case "sparkle":
        return "#F8FAFC";
      case "confidence":
        return "#FDF2F8";

      case "catpaw":
        return "#FAFAFA";
      default:
        return "#FFFFFF";
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
            <G opacity={0.15}>
              <Circle cx="18" cy="18" r="6" fill="#B45309" />
              <Circle cx="42" cy="18" r="6" fill="#B45309" />
              <Circle cx="30" cy="30" r="14" fill="#D97706" />
              <Circle cx="30" cy="32" r="4" fill="#FFF8E1" />
              <Circle cx="30" cy="31" r="1.5" fill="#78350F" />
            </G>
          </Pattern>
        );
      case "heart":
        return (
          <Pattern
            id="heartPattern"
            patternUnits="userSpaceOnUse"
            width={40}
            height={40}
          >
            <Path
              d="M20 35.5L18.6 34.2C13.5 29.6 10 26.4 10 22.5C10 19.3 12.5 16.8 15.7 16.8C17.5 16.8 19.2 17.6 20 19C20.8 17.6 22.5 16.8 24.3 16.8C27.5 16.8 30 19.3 30 22.5C30 26.4 26.5 29.6 21.4 34.2L20 35.5Z"
              fill="#F472B6"
              opacity={0.2}
            />
          </Pattern>
        );
      case "bow":
        return (
          <Pattern
            id="bowPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <Path
              d="M35,25c0-2.8-2.2-5-5-5c-2.3,0-4.3,1.5-4.8,3.6c-0.5-2.1-2.5-3.6-4.8-3.6c-2.8,0-5,2.2-5,5c0,2.4,1.7,4.4,3.9,4.9 C17.3,31.9,16,33.8,16,36h2c0-2.2,1.8-4,4-4h6c2.2,0,4,1.8,4,4h2c0-2.2-1.3-4.1-3.3-6.1C33.3,29.4,35,27.4,35,25z"
              fill="#A78BFA"
              opacity={0.25}
            />
          </Pattern>
        );
      case "flower":
        return (
          <Pattern
            id="flowerPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <G opacity={0.2}>
              <Path
                d="M25 10C27 10 29 12 29 15C29 18 27 20 25 20C23 20 21 18 21 15C21 12 23 10 25 10Z M35 15C37 15 39 17 39 20C39 23 37 25 35 25C33 25 31 23 31 20C31 17 33 15 35 15Z M35 30C37 30 39 32 39 35C39 38 37 40 35 40C33 40 31 38 31 35C31 32 33 30 35 30Z M25 35C27 35 29 37 29 40C29 43 27 45 25 45C23 45 21 43 21 40C21 37 23 35 25 35Z M15 30C17 30 19 32 19 35C19 38 17 40 15 40C13 40 11 38 11 35C11 32 13 30 15 30Z M15 15C17 15 19 17 19 20C19 23 17 25 15 25C13 25 11 23 11 20C11 17 13 15 15 15Z"
                fill="#F472B6"
              />
              <Circle cx="25" cy="27.5" r="5" fill="#FBBF24" />
            </G>
          </Pattern>
        );
      case "cloud":
        return (
          <Pattern
            id="cloudPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            <G opacity={0.3}>
              <Path
                d="M15 25 A 15 15 0 0 1 45 25"
                fill="none"
                stroke="#F472B6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M18 25 A 12 12 0 0 1 42 25"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M18 35C15 35 13 33 13 30C13 27 15 25 18 25C19 22 22 20 25 20C29 20 32 23 32 26C35 26 37 28 37 31C37 34 35 35 32 35H18Z"
                fill="#60A5FA"
              />
            </G>
          </Pattern>
        );
      case "star":
        return (
          <Pattern
            id="starPattern"
            patternUnits="userSpaceOnUse"
            width={55}
            height={55}
          >
            <G opacity={0.25}>
              <Path
                d="M30 15C30 23.2843 23.2843 30 15 30C17.5 30 20 29 22 27C26 23 26 18 22 14C20 12 17.5 11 15 11C23.2843 11 30 17.7157 30 15Z"
                fill="#818CF8"
              />
              <Path
                d="M40 10L42 15L47 17L42 19L40 24L38 19L33 17L38 15Z"
                fill="#FBBF24"
              />
            </G>
          </Pattern>
        );
      case "strawberry":
        return (
          <Pattern
            id="strawberryPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <G opacity={0.2}>
              <Path
                d="M15 15 C10 15, 10 25, 15 30 C20 35, 25 38, 30 35 C35 32, 40 25, 35 15 Z"
                fill="#FB7185"
              />
              <Path
                d="M15 15 C15 10, 20 12, 25 15 C30 12, 35 10, 35 15 L25 18 Z"
                fill="#4ADE80"
              />
              <Circle cx="20" cy="20" r="1" fill="#FFF" />
              <Circle cx="28" cy="22" r="1" fill="#FFF" />
              <Circle cx="22" cy="28" r="1" fill="#FFF" />
            </G>
          </Pattern>
        );
      case "catpaw":
        return (
          <Pattern
            id="catpawPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <G opacity={0.15}>
              <Path
                d="M20 28 C15 25, 15 18, 20 15 C25 12, 35 12, 40 15 C45 18, 45 25, 40 28 C35 32, 25 32, 20 28 Z"
                fill="#475569"
              />
              <Circle cx="18" cy="12" r="3.5" fill="#475569" />
              <Circle cx="30" cy="8" r="3.5" fill="#475569" />
              <Circle cx="42" cy="12" r="3.5" fill="#475569" />
            </G>
          </Pattern>
        );
      case "bunny":
        return (
          <Pattern
            id="bunnyPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            <G opacity={0.18}>
              <Path
                d="M20 30 C15 15, 18 5, 22 5 C26 5, 24 20, 25 30"
                fill="#E879F9"
              />
              <Path
                d="M40 30 C45 15, 42 5, 38 5 C34 5, 36 20, 35 30"
                fill="#E879F9"
              />
              <Circle cx="30" cy="35" r="12" fill="#E879F9" />
            </G>
          </Pattern>
        );

      case "frog":
        return (
          <Pattern
            id="frogPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <G opacity={0.25}>
              <Circle cx="25" cy="25" r="12" fill="#86EFAC" />
              <Circle cx="18" cy="16" r="5" fill="#86EFAC" />
              <Circle cx="32" cy="16" r="5" fill="#86EFAC" />
              <Circle cx="18" cy="16" r="1.5" fill="#14532D" />
              <Circle cx="32" cy="16" r="1.5" fill="#14532D" />
              <Path
                d="M20 28 Q25 32 30 28"
                stroke="#14532D"
                strokeWidth="1.5"
                fill="none"
              />
            </G>
          </Pattern>
        );

      case "lemon":
        return (
          <Pattern
            id="lemonPattern"
            patternUnits="userSpaceOnUse"
            width={55}
            height={55}
          >
            <G opacity={0.3}>
              <Ellipse
                cx="28"
                cy="28"
                rx="14"
                ry="11"
                fill="#FDE047"
                transform="rotate(-45, 28, 28)"
              />
              <Path d="M20 18 Q12 10 20 5 Q28 10 20 18" fill="#4ADE80" />
              <Path
                d="M25 25 Q28 22 32 25"
                stroke="#FEF9C3"
                strokeWidth="2"
                fill="none"
                opacity={0.8}
                transform="rotate(-45, 28, 28)"
              />
            </G>
          </Pattern>
        );

      case "cherry":
        return (
          <Pattern
            id="cherryPattern"
            patternUnits="userSpaceOnUse"
            width={50}
            height={50}
          >
            <G opacity={0.25}>
              <Path
                d="M25 10 L18 25 M25 10 L32 25"
                stroke="#78350F"
                strokeWidth="2"
              />
              <Circle cx="18" cy="28" r="5" fill="#EF4444" />
              <Circle cx="32" cy="28" r="5" fill="#EF4444" />
              <Path
                d="M25 10 Q32 5 35 12"
                stroke="#22C55E"
                strokeWidth="2"
                fill="none"
              />
            </G>
          </Pattern>
        );

      case "mushroom":
        return (
          <Pattern
            id="mushroomPattern"
            patternUnits="userSpaceOnUse"
            width={55}
            height={55}
          >
            <G opacity={0.25}>
              <Rect
                x="22"
                y="30"
                width="16"
                height="12"
                rx="4"
                fill="#E7E5E4"
              />
              <Path d="M15 30 C15 15, 45 15, 45 30 Z" fill="#F87171" />
              <Circle cx="25" cy="22" r="2" fill="#FFF" />
              <Circle cx="35" cy="25" r="2" fill="#FFF" />
              <Circle cx="30" cy="18" r="1.5" fill="#FFF" />
            </G>
          </Pattern>
        );

      case "butterfly":
        return (
          <Pattern
            id="butterflyPattern"
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
          >
            <G opacity={0.2}>
              <Path
                d="M30 30 C20 10, 10 10, 15 30 C10 40, 20 50, 30 30 Z"
                fill="#C084FC"
              />
              <Path
                d="M30 30 C40 10, 50 10, 45 30 C50 40, 40 50, 30 30 Z"
                fill="#C084FC"
              />
              <Rect x="29" y="20" width="2" height="20" rx="1" fill="#7E22CE" />
              <Path
                d="M29 20 L25 15 M31 20 L35 15"
                stroke="#7E22CE"
                strokeWidth="1"
              />
            </G>
          </Pattern>
        );

      case "sparkle":
        return (
          <Pattern
            id="sparklePattern"
            patternUnits="userSpaceOnUse"
            width={45}
            height={45}
          >
            <G opacity={0.2}>
              <Path
                d="M22 10 C22 10, 25 20, 32 22 C25 24, 22 34, 22 34 C22 34, 19 24, 12 22 C19 20, 22 10, 22 10 Z"
                fill="#38BDF8"
              />
              <Circle cx="35" cy="12" r="1" fill="#38BDF8" />
              <Circle cx="10" cy="30" r="1.5" fill="#38BDF8" />
            </G>
          </Pattern>
        );

      case "confidence":
        return (
          <Pattern
            id="confidencePattern"
            patternUnits="userSpaceOnUse"
            width={200}
            height={200}
          >
            <G opacity={0.35}>
              {/* Main Text - Purple (Moved down to avoid top cut) */}
              <SvgText
                x="30"
                y="90"
                fill="#9333EA"
                fontSize="24"
                fontWeight="bold"
                transform="rotate(-30, 30, 90)"
              >
                Daddys Slut!
              </SvgText>

              {/* Secondary Text - Pink (Moved left to avoid side cut) */}
              <SvgText
                x="80"
                y="180"
                fill="#DB2777"
                fontSize="24"
                fontWeight="bold"
                transform="rotate(-30, 80, 180)"
              >
                Daddys Slut!
              </SvgText>

              {/* Peach Emoji */}
              <SvgText
                x="150"
                y="60"
                fontSize="30"
                transform="rotate(20, 150, 60)"
              >
                🍑
              </SvgText>

              {/* Lip Bite Emoji */}
              <SvgText
                x="40"
                y="160"
                fontSize="30"
                transform="rotate(-15, 40, 160)"
              >
                🫦
              </SvgText>
            </G>
          </Pattern>
        );

      default:
        return null;
    }
  };

  const getPatternId = () => {
    return pattern === "none" ? "none" : `url(#${pattern}Pattern)`;
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

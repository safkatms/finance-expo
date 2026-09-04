import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (isLoading) {
    return (
      <View style={s.container}>
        <Animated.Image
          source={require("../assets/finance.png")}
          style={[s.logo, { opacity }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Redirect href={isAuthenticated ? "/(app)/dashboard" : "/(auth)/login"} />
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 120,
    height: 120,
  },
});

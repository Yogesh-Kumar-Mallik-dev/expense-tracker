import React from "react";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { NativeScreen } from "./native-screen";

export function StarterApp() {
  return (
    <NativeScreen>
      <StatusBar style="light" />
      <View className="flex-1 justify-center px-8">
        <Text className="mb-3 text-xs font-bold uppercase tracking-[3px] text-mint">
          Expense Tracker Mobile
        </Text>
        <Text className="text-5xl font-bold leading-[52px] tracking-tight text-white">
          Your finances stay available offline.
        </Text>
        <Text className="mt-6 text-lg leading-7 text-sage">
          Expo, a development client, and NativeWind are ready for the mobile
          PowerSync bootstrap.
        </Text>
      </View>
    </NativeScreen>
  );
}

import React, { type ReactNode } from "react";
import { SafeAreaView, View } from "react-native";
import { nativeColors } from "./tokens";

export interface NativeScreenProps {
  children: ReactNode;
}

export function NativeScreen({ children }: NativeScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeColors.ink }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

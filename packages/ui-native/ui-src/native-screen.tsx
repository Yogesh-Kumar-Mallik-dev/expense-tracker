import type { PropsWithChildren } from "react";
import { SafeAreaView, View } from "react-native";
import { nativeColors } from "./tokens";

export function NativeScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeColors.ink }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

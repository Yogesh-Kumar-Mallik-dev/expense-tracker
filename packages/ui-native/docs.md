# Native UI Architecture

`@expense-tracker/ui-native` owns React Native primitives used by Expo.
Components and native design tokens live exclusively in `ui-src/`.

The package must not import DOM APIs, Next.js, or Tauri. NativeWind classes may
be used when their types are available to this package; platform-independent
style objects are preferred for foundational screen primitives.

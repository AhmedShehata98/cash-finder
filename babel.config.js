module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./src",
            "@/components": "./src/components",
            "@/features": "./src/features",
            "@/hooks": "./src/hooks",
            "@/services": "./src/services",
            "@/store": "./src/store",
            "@/constants": "./src/constants",
            "@/lib": "./src/lib",
            "@/utils": "./src/utils",
            "@/types": "./src/types",
            "@/theme": "./src/theme",
            "@/assets": "./assets",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  }
}

module.exports = function (api) {
  const isTest = api.env("test")
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ...(!isTest
        ? [
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
          ]
        : []),
      "react-native-reanimated/plugin",
    ],
  }
}

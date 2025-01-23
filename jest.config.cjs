module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/test/**/*.test.ts"],
  moduleDirectories: ["node_modules", "src"],
  moduleFileExtensions: ["ts", "js"],
  transformIgnorePatterns: ["node_modules/(?!(electron-store|ssh2)/)"],
  moduleNameMapper: {
    "^electron-store$": "<rootDir>/test/mocks/electron-store.js",
  },
};

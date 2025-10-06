const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./src/index.jsx",
  output: {
    path: path.resolve(__dirname, "wwwroot/js"),
    filename: "bundle.js",
    clean: true, // Clean output directory
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|mjs)$/, // Support .mjs for @react-aria/ssr
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
            plugins: ["@babel/plugin-transform-runtime"], // For async/await
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".mjs"], // Support .mjs
    fallback: {
      // Polyfills for Node.js core modules
      fs: false, // Not needed in browser
      url: require.resolve("url"), // Fixed: Removed trailing slash
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      assert: require.resolve("assert"), // For packages like material-react-table
      util: require.resolve("util"), // For packages like xlsx
      path: require.resolve("path-browserify"), // For path resolution
    },
    alias: {
      // Fix module resolution
      "@mui/material": path.resolve(__dirname, "node_modules/@mui/material"),
      "react-router": path.resolve(__dirname, "node_modules/react-router"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "wwwroot/index.html"),
      filename: "index.html",
    }),
  ],
  mode: "production", // Match your build command
  devtool: "source-map", // Improve debugging
};

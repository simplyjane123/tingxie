module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta → process for zustand v5 web compat
      function () {
        return {
          visitor: {
            MetaProperty(path) {
              path.replaceWithSourceString('({ env: process.env, url: "" })');
            },
          },
        };
      },
      'react-native-reanimated/plugin',
    ],
  };
};

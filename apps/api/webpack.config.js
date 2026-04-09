const path = require("path");

module.exports = (options, webpack) => {
  const { externals, ...restOptions } = options;
  return {
    ...restOptions,
    externals: [
      // externalizar tudo de node_modules EXCETO @intimare/*
      function ({ request }, callback) {
        if (!request) return callback();
        // incluir no bundle (não externalizar)
        if (
          request.startsWith(".") ||
          request.startsWith("/") ||
          request.startsWith("@intimare/")
        ) {
          return callback();
        }
        // externalizar node_modules
        if (!request.startsWith(".") && !path.isAbsolute(request)) {
          return callback(null, "commonjs " + request);
        }
        callback();
      },
    ],
    resolve: {
      ...restOptions.resolve,
      alias: {
        "@intimare/database": path.resolve(
          __dirname,
          "../../packages/database/src/index.ts"
        ),
      },
    },
  };
};

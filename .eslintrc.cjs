/**
 * WORKAROUND: Empty .eslintrc file required for import-x/no-unused-modules rule.
 *
 * The `import-x/no-unused-modules` rule needs access to internal ESLint APIs
 * that aren't exposed in ESLint 9 flat config mode. This empty file provides
 * the workaround - ESLint will use eslint.config.js for actual configuration.
 *
 * @see https://github.com/import-js/eslint-plugin-import/issues/3079
 *
 * TODO: Remove this file once eslint-plugin-import-x fixes flat config support.
 * Track: https://github.com/un-ts/eslint-plugin-import-x/issues (search for "flat config")
 */
module.exports = {}

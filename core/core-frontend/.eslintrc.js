module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'prettier',
        'plugin:vue/vue3-essential',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ],
    overrides: [],
    parser: 'vue-eslint-parser',
    parserOptions: {
        ecmaVersion: 'latest',
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
        jsxPragma: 'React',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['vue', '@typescript-eslint'],
    rules: {
        // 关闭所有 TypeScript 相关警告
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        
        // 关闭 Vue 相关警告
        'vue/multi-word-component-names': 'off',
        'vue/no-setup-props-destructure': 'off',
        'vue/no-v-html': 'off',
        'vue/require-default-prop': 'off',
        'vue/no-unused-components': 'off',
        'vue/no-unused-vars': 'off',
        
        // 关闭其他常见警告
        'no-console': 'off',
        'no-debugger': 'off',
        'no-unused-vars': 'off',
        'no-empty': 'off',
        'no-undef': 'off',
        'no-redeclare': 'off',
        'no-var': 'off',
        'prefer-const': 'off',
        'prettier/prettier': 'off'
    }
}

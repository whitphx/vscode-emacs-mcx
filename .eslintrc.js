module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "ignorePatterns": [],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "warn",
        "@typescript-eslint/array-type": "warn",
        "@typescript-eslint/ban-types": "warn",
        "@typescript-eslint/class-name-casing": "warn",
        "@typescript-eslint/consistent-type-assertions": "warn",
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/no-empty-interface": "warn",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-misused-new": "warn",
        "@typescript-eslint/no-namespace": "warn",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "warn",
        "@typescript-eslint/prefer-for-of": "warn",
        "@typescript-eslint/prefer-function-type": "warn",
        "@typescript-eslint/prefer-namespace-keyword": "warn",
        "@typescript-eslint/semi": [
            "warn",
            "always"
        ],
        "@typescript-eslint/triple-slash-reference": "warn",
        "@typescript-eslint/unified-signatures": "warn",
        "camelcase": "warn",
        "complexity": "off",
        "constructor-super": "warn",
        "curly": "warn",
        "dot-notation": "warn",
        "eqeqeq": [
            "warn",
            "always"
        ],
        "guard-for-in": "warn",
        "id-blacklist": [
            "warn",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined"
        ],
        "id-match": "warn",
        "max-classes-per-file": [
            "warn",
            1
        ],
        "new-parens": "warn",
        "no-bitwise": "warn",
        "no-caller": "warn",
        "no-cond-assign": "warn",
        "no-console": "warn",
        "no-debugger": "warn",
        "no-empty": "warn",
        "no-eval": "warn",
        "no-fallthrough": "off",
        "no-invalid-this": "off",
        "no-new-wrappers": "warn",
        "no-redeclare": "warn",
        "no-shadow": [
            "warn",
            {
                "hoist": "all"
            }
        ],
        "no-throw-literal": "warn",
        "no-trailing-spaces": "warn",
        "no-undef-init": "warn",
        "no-underscore-dangle": "warn",
        "no-unsafe-finally": "warn",
        "no-unused-expressions": "warn",
        "no-unused-labels": "warn",
        "no-var": "warn",
        "object-shorthand": "warn",
        "one-var": [
            "warn",
            "never"
        ],
        "prefer-arrow/prefer-arrow-functions": "warn",
        "prefer-const": "warn",
        "radix": "warn",
        "spaced-comment": "warn",
        "use-isnan": "warn",
        "valid-typeof": "off",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rules": {
                    "jsdoc-format": true,
                    "no-reference-import": true
                }
            }
        ],
        "@typescript-eslint/await-thenable": [
            "warn"
        ],
        "@typescript-eslint/no-for-in-array": [
            "error"
        ],
        "@typescript-eslint/no-misused-promises": [
            "warn"
        ],
        "@typescript-eslint/no-unnecessary-type-assertion": [
            "error"
        ],
        "@typescript-eslint/prefer-includes": [
            "error"
        ],
        "@typescript-eslint/prefer-regexp-exec": [
            "error"
        ],
        "@typescript-eslint/prefer-string-starts-ends-with": [
            "error"
        ],
        "require-await": [
            "off"
        ],
        "@typescript-eslint/require-await": [
            "warn"
        ],
        "@typescript-eslint/unbound-method": [
            "warn"
        ],
        "prefer-rest-params": [
            "error"
        ],
        "prefer-spread": [
            "error"
        ],
        "@typescript-eslint/ban-ts-ignore": [
            "error"
        ],
        "@typescript-eslint/camelcase": [
            "error"
        ],
        "@typescript-eslint/explicit-function-return-type": [
            "warn"
        ],
        "@typescript-eslint/interface-name-prefix": [
            "warn"
        ],
        "no-array-constructor": [
            "off"
        ],
        "@typescript-eslint/no-array-constructor": [
            "error"
        ],
        "no-empty-function": [
            "off"
        ],
        "@typescript-eslint/no-inferrable-types": [
            "warn"
        ],
        "@typescript-eslint/no-non-null-assertion": [
            "warn"
        ],
        "@typescript-eslint/no-this-alias": [
            "error"
        ],
        "no-unused-vars": [
            "off"
        ],
        "@typescript-eslint/no-unused-vars": [
            "warn"
        ],
        "no-use-before-define": [
            "off"
        ],
        "@typescript-eslint/type-annotation-spacing": [
            "error"
        ]
    },
    "settings": {}
};

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    transformIgnorePatterns: [
        // Transform JS modules that ship as ES modules in node_modules
        '/node_modules/(?!(stellar-sdk|@stellar|axios)/)'
    ],
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
    },
};

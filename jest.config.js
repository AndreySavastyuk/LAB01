module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: './coverage/',
    coverageReporters: ['json', 'lcov', 'text', 'html'],
    testMatch: [
        '**/test/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    collectCoverageFrom: [
        'app.js',
        'public/js/**/*.js',
        '!public/js/sap-ui5/lib/**',
        '!**/node_modules/**',
        '!server.js'
    ],
    coverageThreshold: {
        global: {
            branches: 8,
            functions: 10,
            lines: 14,
            statements: 14
        }
    }
}; 
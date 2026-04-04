import * as exporterTests from './tests/exporter.test.js';

async function runTests() {
    let failed = false;
    for (const testName in exporterTests) {
        if (typeof exporterTests[testName] === 'function') {
            try {
                exporterTests[testName]();
            } catch (error) {
                console.error(`❌ ${testName} failed:`, error.message);
                failed = true;
            }
        }
    }
    if (failed) {
        process.exit(1);
    }
}

runTests();

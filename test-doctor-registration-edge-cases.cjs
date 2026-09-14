// Test edge cases for doctor registration
const http = require('http');

const baseData = {
    name: "Dr. Test Edge Case",
    email: "doctor.edgecase@example.com",
    password: "password123",
    registrationNumber: "BMDC-999999",
    qualification: "MBBS",
    contactNumber: "01799999999",
};

const makeRequest = (specialtyId, testData) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            ...testData,
            specialtyId
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/auth/register-doctor',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
};

async function runEdgeCaseTests() {
    console.log('Testing Edge Cases for Doctor Registration\n');

    // Test 1: Invalid specialty ID
    console.log('Test 1: Invalid specialty ID');
    try {
        const result = await makeRequest('invalid-uuid-12345', { ...baseData, email: 'doctor.invalid@example.com' });
        console.log('Status:', result.statusCode);
        console.log('Expected: 404');
        console.log('---');
    } catch (error) {
        console.error('Error:', error);
    }

    // Test 2: Duplicate email
    console.log('\nTest 2: Duplicate email (using existing email)');
    try {
        const result = await makeRequest('019c3337-46f0-744c-a615-0d778692d129', { ...baseData, email: 'doctor.test@example.com' });
        console.log('Status:', result.statusCode);
        console.log('Expected: 409 (Conflict)');
        console.log('---');
    } catch (error) {
        console.error('Error:', error);
    }

    // Test 3: Duplicate registration number
    console.log('\nTest 3: Duplicate registration number');
    try {
        const result = await makeRequest('019c3337-46f0-744c-a615-0d778692d129', { ...baseData, email: 'doctor.dup@example.com', registrationNumber: 'BMDC-123456' });
        console.log('Status:', result.statusCode);
        console.log('Expected: 409 (Conflict)');
        console.log('---');
    } catch (error) {
        console.error('Error:', error);
    }

    // Test 4: Invalid payload (missing fields)
    console.log('\nTest 4: Invalid payload (missing name)');
    try {
        const { name, ...invalidData } = baseData;
        const result = await makeRequest('019c3337-46f0-744c-a615-0d778692d129', { ...invalidData, email: 'doctor.invalid2@example.com' });
        console.log('Status:', result.statusCode);
        console.log('Expected: 400 (Validation Error)');
        console.log('---');
    } catch (error) {
        console.error('Error:', error);
    }

    console.log('\nEdge case tests completed');
}

runEdgeCaseTests();
// Simple test script for doctor registration
const http = require('http');

const testData = {
    name: "Dr. John Doe",
    email: "doctor.test@example.com",
    password: "password123",
    registrationNumber: "BMDC-123456",
    qualification: "MBBS",
    contactNumber: "01712345678",
    specialtyId: "existing-specialty-uuid" // We'll need to get a real one
};

// First, let's get a specialty
const getSpecialty = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/specialties',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.success && response.data && response.data.length > 0) {
                        resolve(response.data[0].id);
                    } else {
                        reject('No specialties found');
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
};

// Register doctor
const registerDoctor = (specialtyId) => {
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
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
};

// Run tests
async function runTests() {
    try {
        console.log('Getting specialty...');
        const specialtyId = await getSpecialty();
        console.log('Found specialty ID:', specialtyId);

        console.log('\nTesting doctor registration...');
        const result = await registerDoctor(specialtyId);
        console.log('Test completed with status:', result.statusCode);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTests();
// test-cors.js - Run this in your backend folder to test CORS
const axios = require('axios');

const testCORS = async () => {
<<<<<<< HEAD
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5000';
  const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
=======
  const baseURL = 'https://photo-marathon.onrender.com';
  const origin = 'https://photo-marathon-wbbr.vercel.app';
>>>>>>> origin/main

  try {
    console.log('Testing CORS configuration...');
    
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`, {
      headers: {
        'Origin': origin
      }
    });
    console.log('✅ Health check passed:', healthResponse.data.message);

    // Test 2: OPTIONS request (preflight)
    console.log('\n2. Testing preflight request...');
    const preflightResponse = await axios.options(`${baseURL}/api/auth/admin/login`, {
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    console.log('✅ Preflight passed:', preflightResponse.status);

    // Test 3: Actual POST request
    console.log('\n3. Testing actual POST request...');
    try {
      await axios.post(`${baseURL}/api/auth/admin/login`, {
        email: 'test@test.com',
        password: 'test123'
      }, {
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        console.log('✅ POST request reached server (expected auth error)');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All CORS tests passed!');

  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
};

testCORS();
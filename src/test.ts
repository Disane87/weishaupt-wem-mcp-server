#!/usr/bin/env node

/**
 * Simple test script to verify WEM client functionality
 * Run with: node build/test.js
 */

import { WEMClient } from './wem-client.js';
import * as dotenv from 'dotenv';

dotenv.config();

const username = process.env.WEM_USERNAME;
const password = process.env.WEM_PASSWORD;
const apiUrl = process.env.WEM_API_URL || 'https://www.wemportal.com/app';

if (!username || !password) {
  console.error('Error: WEM_USERNAME and WEM_PASSWORD must be set in .env file');
  process.exit(1);
}

async function runTests(): Promise<void> {
  console.log('Testing WEM Portal Client...\n');

  const client = new WEMClient(username as string, password as string, apiUrl);

  try {
    // Test 1: Login
    console.log('1. Testing login...');
    await client.login();
    console.log('   Login successful!\n');

    // Test 2: Get Devices
    console.log('2. Testing get devices...');
    const devices = await client.getDevices();
    console.log(`   Found ${devices.length} device(s)`);
    devices.forEach((device, idx) => {
      console.log(`   ${idx + 1}. ${device.Name} (ID: ${device.ID}, Status: ${device.ConnectionStatus})`);
      device.Modules.forEach((mod) => {
        console.log(`      - Module: ${mod.Name} (Index: ${mod.Index}, Type: ${mod.Type})`);
      });
    });

    // Test 3: Get Parameters (for first module of first device)
    if (devices.length > 0 && devices[0].Modules.length > 0) {
      const device = devices[0];
      const mod = device.Modules[0];
      console.log(`\n3. Testing get parameters for ${device.Name} / ${mod.Name}...`);
      const parameters = await client.getAllParameters(device.ID, mod.Index, mod.Type);
      console.log(`   Found ${parameters.length} parameter(s)`);

      const sampleParams = parameters.slice(0, 5);
      sampleParams.forEach((param, idx) => {
        console.log(`   ${idx + 1}. ${param.Name}: ${param.NumericValue} ${param.Unit} ${param.IsWriteable ? '(writable)' : '(read-only)'}`);
      });

      if (parameters.length > 5) {
        console.log(`   ... and ${parameters.length - 5} more parameters`);
      }
    }

    // Test 4: Get Device Status
    if (devices.length > 0) {
      console.log('\n4. Testing device status...');
      const status = await client.getDeviceStatus(devices[0].ID);
      console.log('   Status:', JSON.stringify(status, null, 2));
    }

    // Test 5: Logout
    console.log('\n5. Testing logout...');
    await client.logout();
    console.log('   Logout successful');

    console.log('\nAll tests passed!');

  } catch (error: any) {
    console.error('\nTest failed:', error.message);
    console.error(error);
  }
}

runTests();

#!/usr/bin/env node

/**
 * CLI Inspector - Quick test for WEM API calls
 * Usage: node build/inspector.js <command> [args-json]
 *
 * Examples:
 *   node build/inspector.js devices
 *   node build/inspector.js status '{"deviceId": "123"}'
 *   node build/inspector.js params '{"deviceId": "123", "moduleIndex": 0, "moduleType": 7}'
 *   node build/inspector.js write '{"deviceId": "123", "moduleIndex": 0, "moduleType": 7, "parameterId": "abc", "numericValue": 22}'
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

const client = new WEMClient(username, password, apiUrl);

async function main(): Promise<void> {
  const command = process.argv[2];
  const argsJson = process.argv[3];

  if (!command) {
    console.log('Usage: node build/inspector.js <command> [args-json]\n');
    console.log('Commands:');
    console.log('  devices                    - List all devices + modules');
    console.log('  status   {deviceId}        - Device connection status');
    console.log('  meta     {deviceId, moduleIndex, moduleType}  - Parameter metadata');
    console.log('  params   {deviceId, moduleIndex, moduleType}  - All parameter values');
    console.log('  read     {deviceId, moduleIndex, moduleType, parameterIds: [...]}');
    console.log('  write    {deviceId, moduleIndex, moduleType, parameterId, numericValue}');
    process.exit(1);
  }

  let args: any = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch (error: any) {
      console.error('Invalid JSON:', error.message);
      process.exit(1);
    }
  }

  console.log(`Command: ${command}`);
  console.log(`Args: ${JSON.stringify(args)}\n`);

  try {
    let result: any;

    switch (command) {
      case 'devices':
        result = await client.getDevices();
        break;

      case 'status':
        result = await client.getDeviceStatus(args.deviceId);
        break;

      case 'meta':
        result = await client.getParameterMeta(args.deviceId, args.moduleIndex, args.moduleType);
        break;

      case 'params':
        result = await client.getAllParameters(args.deviceId, args.moduleIndex, args.moduleType);
        break;

      case 'read': {
        const moduleRef = [{ moduleIndex: args.moduleIndex, moduleType: args.moduleType, parameterIds: args.parameterIds }];
        await client.refreshParameters(args.deviceId, moduleRef);
        result = await client.readParameters(args.deviceId, moduleRef);
        break;
      }

      case 'write':
        await client.writeParameter(args.deviceId, args.moduleIndex, args.moduleType, args.parameterId, args.numericValue, args.stringValue || '');
        result = { success: true };
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.logout();
  }
}

main();

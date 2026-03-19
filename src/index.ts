#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WEMClient } from './wem-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

dotenv.config();

const WEM_USERNAME = process.env.WEM_USERNAME;
const WEM_PASSWORD = process.env.WEM_PASSWORD;
const WEM_API_URL = process.env.WEM_API_URL || 'https://www.wemportal.com/app';

if (!WEM_USERNAME || !WEM_PASSWORD) {
  console.error('Error: WEM_USERNAME and WEM_PASSWORD must be set in environment variables');
  process.exit(1);
}

const wemClient = new WEMClient(WEM_USERNAME, WEM_PASSWORD, WEM_API_URL);

const server = new Server(
  {
    name: pkg.name,
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// --- Tool Definitions ---

const TOOLS: Tool[] = [
  {
    name: 'wem_get_devices',
    description: 'Get all WEM devices with their modules. Returns device IDs, names, connection status, and module list (each with Index, Type, Name). Use this first to discover deviceId, moduleIndex, and moduleType needed for other tools.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wem_get_device_status',
    description: 'Get connection/online status of a specific device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'wem_get_parameter_meta',
    description: 'Get metadata for all parameters of a module: parameter IDs, names, writable flag, data types, min/max values, enum options. Use this to discover available parameters before reading values.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
        moduleIndex: {
          type: 'number',
          description: 'Module index (from device\'s Modules array)',
        },
        moduleType: {
          type: 'number',
          description: 'Module type (from device\'s Modules array)',
        },
      },
      required: ['deviceId', 'moduleIndex', 'moduleType'],
    },
  },
  {
    name: 'wem_get_parameters',
    description: 'Get all parameters of a module with current values. Combines metadata + refresh + read into one call. Returns parameter names, current numeric/string values, units, and writable flags.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
        moduleIndex: {
          type: 'number',
          description: 'Module index (from device\'s Modules array)',
        },
        moduleType: {
          type: 'number',
          description: 'Module type (from device\'s Modules array)',
        },
      },
      required: ['deviceId', 'moduleIndex', 'moduleType'],
    },
  },
  {
    name: 'wem_read_parameters',
    description: 'Read current values for specific parameters. Refreshes data from device first, then reads. Use when you only need specific parameter values instead of all.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
        moduleIndex: {
          type: 'number',
          description: 'Module index',
        },
        moduleType: {
          type: 'number',
          description: 'Module type',
        },
        parameterIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of parameter IDs to read (from wem_get_parameter_meta)',
        },
      },
      required: ['deviceId', 'moduleIndex', 'moduleType', 'parameterIds'],
    },
  },
  {
    name: 'wem_get_overview',
    description: 'Get a complete overview of a device: all modules with all their parameters and current values in a single call. Useful for getting a full picture of the heating system state.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'wem_get_writable_parameters',
    description: 'Get only the writable parameters of a module (parameters that can be changed). Shows current values, min/max ranges, and enum options. Useful to see what can be adjusted.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
        moduleIndex: {
          type: 'number',
          description: 'Module index',
        },
        moduleType: {
          type: 'number',
          description: 'Module type',
        },
      },
      required: ['deviceId', 'moduleIndex', 'moduleType'],
    },
  },
  {
    name: 'wem_write_parameter',
    description: 'Set a parameter value (e.g., target temperature). Only works for writable parameters. Check wem_get_parameter_meta for min/max values and enum options first.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (from wem_get_devices)',
        },
        moduleIndex: {
          type: 'number',
          description: 'Module index',
        },
        moduleType: {
          type: 'number',
          description: 'Module type',
        },
        parameterId: {
          type: 'string',
          description: 'Parameter ID to write',
        },
        numericValue: {
          type: 'number',
          description: 'Numeric value to set',
        },
        stringValue: {
          type: 'string',
          description: 'String value (optional, for enum/text parameters)',
          default: '',
        },
      },
      required: ['deviceId', 'moduleIndex', 'moduleType', 'parameterId', 'numericValue'],
    },
  },
];

// --- Handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'wem_get_devices': {
        const devices = await wemClient.getDevices();
        return {
          content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }],
        };
      }

      case 'wem_get_device_status': {
        const deviceId = args?.deviceId as string;
        if (!deviceId) throw new Error('deviceId is required');

        const status = await wemClient.getDeviceStatus(deviceId);
        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
        };
      }

      case 'wem_get_parameter_meta': {
        const deviceId = args?.deviceId as string;
        const moduleIndex = args?.moduleIndex as number;
        const moduleType = args?.moduleType as number;
        if (!deviceId || moduleIndex === undefined || moduleType === undefined) {
          throw new Error('deviceId, moduleIndex, and moduleType are required');
        }

        const meta = await wemClient.getParameterMeta(deviceId, moduleIndex, moduleType);
        return {
          content: [{ type: 'text', text: JSON.stringify(meta, null, 2) }],
        };
      }

      case 'wem_get_parameters': {
        const deviceId = args?.deviceId as string;
        const moduleIndex = args?.moduleIndex as number;
        const moduleType = args?.moduleType as number;
        if (!deviceId || moduleIndex === undefined || moduleType === undefined) {
          throw new Error('deviceId, moduleIndex, and moduleType are required');
        }

        const params = await wemClient.getAllParameters(deviceId, moduleIndex, moduleType);
        return {
          content: [{ type: 'text', text: JSON.stringify(params, null, 2) }],
        };
      }

      case 'wem_read_parameters': {
        const deviceId = args?.deviceId as string;
        const moduleIndex = args?.moduleIndex as number;
        const moduleType = args?.moduleType as number;
        const parameterIds = args?.parameterIds as string[];
        if (!deviceId || moduleIndex === undefined || moduleType === undefined || !parameterIds?.length) {
          throw new Error('deviceId, moduleIndex, moduleType, and parameterIds are required');
        }

        const moduleRef = [{ moduleIndex, moduleType, parameterIds }];
        await wemClient.refreshParameters(deviceId, moduleRef);
        const result = await wemClient.readParameters(deviceId, moduleRef);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'wem_get_overview': {
        const deviceId = args?.deviceId as string;
        if (!deviceId) throw new Error('deviceId is required');

        const overview = await wemClient.getDeviceOverview(deviceId);
        return {
          content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }],
        };
      }

      case 'wem_get_writable_parameters': {
        const deviceId = args?.deviceId as string;
        const moduleIndex = args?.moduleIndex as number;
        const moduleType = args?.moduleType as number;
        if (!deviceId || moduleIndex === undefined || moduleType === undefined) {
          throw new Error('deviceId, moduleIndex, and moduleType are required');
        }

        const allParams = await wemClient.getAllParameters(deviceId, moduleIndex, moduleType);
        const writable = allParams.filter(p => p.IsWriteable);
        return {
          content: [{ type: 'text', text: JSON.stringify(writable, null, 2) }],
        };
      }

      case 'wem_write_parameter': {
        const deviceId = args?.deviceId as string;
        const moduleIndex = args?.moduleIndex as number;
        const moduleType = args?.moduleType as number;
        const parameterId = args?.parameterId as string;
        const numericValue = args?.numericValue as number;
        const stringValue = (args?.stringValue as string) || '';
        if (!deviceId || moduleIndex === undefined || moduleType === undefined || !parameterId || numericValue === undefined) {
          throw new Error('deviceId, moduleIndex, moduleType, parameterId, and numericValue are required');
        }

        await wemClient.writeParameter(deviceId, moduleIndex, moduleType, parameterId, numericValue, stringValue);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Parameter written successfully' }) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weishaupt WEM MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

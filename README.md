# Weishaupt WEM Portal MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants like Claude to your Weishaupt heating system via the WEM Portal.

## Features

- List devices and modules from your WEM Portal account
- Read all parameters with live values (temperatures, pressure, operating modes, etc.)
- Write parameters (target temperatures, operating modes, schedules, etc.)
- Check device connection status
- Automatic session management with cookie-based authentication
- Concurrent request handling with login lock

## Quick Start

### Install via npx (recommended)

No installation needed. Configure your MCP client to run:

```bash
npx @disane-dev/weishaupt-wem-mcp-server
```

### Install from source

```bash
git clone https://github.com/disane87/weishaupt-wem-mcp-server.git
cd weishaupt-wem-mcp-server
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "weishaupt-wem": {
      "command": "npx",
      "args": ["-y", "@disane-dev/weishaupt-wem-mcp-server"],
      "env": {
        "WEM_USERNAME": "your_email@example.com",
        "WEM_PASSWORD": "your_password"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add weishaupt-wem -- npx -y weishaupt-wem-mcp-server
```

Set the environment variables `WEM_USERNAME` and `WEM_PASSWORD` before starting.

### From source

```json
{
  "mcpServers": {
    "weishaupt-wem": {
      "command": "node",
      "args": ["/path/to/wem-mcp/build/index.js"],
      "env": {
        "WEM_USERNAME": "your_email@example.com",
        "WEM_PASSWORD": "your_password"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WEM_USERNAME` | Yes | Your WEM Portal email |
| `WEM_PASSWORD` | Yes | Your WEM Portal password |
| `WEM_API_URL` | No | API base URL (default: `https://www.wemportal.com/app`) |

## Available Tools

### `wem_get_devices`

Lists all devices with their modules. **Call this first** to get the `deviceId`, `moduleIndex`, and `moduleType` needed by other tools.

### `wem_get_device_status`

Returns the connection status of a device.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deviceId` | string | Yes | Device ID from `wem_get_devices` |

### `wem_get_parameter_meta`

Returns metadata for all parameters of a module: names, IDs, writable flag, min/max values, enum options.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deviceId` | string | Yes | Device ID |
| `moduleIndex` | number | Yes | Module index |
| `moduleType` | number | Yes | Module type |

### `wem_get_parameters`

Returns all parameters of a module with current values. Combines metadata + refresh + read into one call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deviceId` | string | Yes | Device ID |
| `moduleIndex` | number | Yes | Module index |
| `moduleType` | number | Yes | Module type |

### `wem_read_parameters`

Reads specific parameter values. Use when you only need a subset of parameters.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deviceId` | string | Yes | Device ID |
| `moduleIndex` | number | Yes | Module index |
| `moduleType` | number | Yes | Module type |
| `parameterIds` | string[] | Yes | Array of parameter IDs |

### `wem_write_parameter`

Sets a parameter value. Only works for writable parameters.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deviceId` | string | Yes | Device ID |
| `moduleIndex` | number | Yes | Module index |
| `moduleType` | number | Yes | Module type |
| `parameterId` | string | Yes | Parameter ID |
| `numericValue` | number | Yes | Value to set |
| `stringValue` | string | No | String value for enum parameters |

## Typical Workflow

```
1. wem_get_devices
   -> Returns devices with modules (e.g. WE0=heat generator, HZK0=heating circuit, WW0=hot water)

2. wem_get_parameters (deviceId, moduleIndex, moduleType)
   -> Returns all parameters with current values

3. wem_write_parameter (deviceId, moduleIndex, moduleType, parameterId, numericValue)
   -> Sets a writable parameter (e.g. target temperature)
```

### Common Module Types

| Type | Name | Description |
|---|---|---|
| 1 | SYSTEM | System overview |
| 2 | HZK | Heating circuit (temperatures, operating mode) |
| 3 | WW | Hot water (temperature, push, schedule) |
| 5 | TERMINAL | Control panel |
| 6 | GATEWAY | Communication gateway |
| 7 | WE | Heat generator (boiler/heat pump performance) |
| 9 | Device | Physical device unit |
| 10 | GROUND | Ground module |

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Run server directly
npm start

# Test API connection
npm test

# Official MCP Inspector (Web UI)
npm run inspector

# CLI inspector for quick API tests
npm run inspector:cli -- devices
npm run inspector:cli -- params '{"deviceId": "123", "moduleIndex": 0, "moduleType": 7}'
```

## Troubleshooting

### Authentication failed

- Verify credentials at [wemportal.com](https://www.wemportal.com/)
- Check that `WEM_USERNAME` and `WEM_PASSWORD` are set correctly
- The WEM Portal may temporarily block after too many failed attempts

### Connection timeout

- Check internet connectivity
- The WEM Portal may be temporarily unavailable
- Default timeout is 30 seconds (configurable in `src/wem-client.ts`)

### Parameter values show 0

- Some parameters (e.g. room temperature) require a physical sensor connected to the device
- A value of `0` may indicate no sensor is installed

## License

MIT - see [LICENSE](LICENSE)

<div align="center">

<img src="https://www.wemportal.com/favicon.ico" alt="WEM Portal" width="80" />

# Weishaupt WEM Portal MCP Server

**Control and monitor your Weishaupt heating system with AI assistants via the WEM Portal**

[![Version](https://img.shields.io/github/v/release/Disane87/weishaupt-wem-mcp-server?style=for-the-badge&label=Version&color=e63946)](https://github.com/Disane87/weishaupt-wem-mcp-server/releases)
[![npm](https://img.shields.io/npm/v/@disane-dev/weishaupt-wem-mcp-server?style=for-the-badge&logo=npm&color=e63946)](https://www.npmjs.com/package/@disane-dev/weishaupt-wem-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Blog](https://img.shields.io/badge/Blog-disane.dev-blue?style=for-the-badge&logo=ghost&logoColor=white)](https://blog.disane.dev)
[![Website](https://img.shields.io/badge/Website-disane.dev-blue?style=for-the-badge&logo=safari&logoColor=white)](https://disane.dev)

[![MCP](https://img.shields.io/badge/MCP-Server-purple?style=flat-square&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js_%3E=18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![semantic-release](https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?style=flat-square&logo=semantic-release)](https://github.com/semantic-release/semantic-release)

![GitHub Stars](https://img.shields.io/github/stars/Disane87/weishaupt-wem-mcp-server?style=flat-square&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/Disane87/weishaupt-wem-mcp-server?style=flat-square&logo=github)
![CI](https://img.shields.io/github/actions/workflow/status/Disane87/weishaupt-wem-mcp-server/release.yml?style=flat-square&label=Release&logo=github)

</div>

---

## Features

- **Device Discovery** - List all devices and modules from your WEM Portal account
- **Live Parameters** - Read temperatures, pressure, operating modes with current values
- **Full Overview** - Get a complete snapshot of your entire heating system in one call
- **Write Parameters** - Adjust target temperatures, operating modes, schedules
- **Device Status** - Check connection status of your devices
- **Writable Filter** - List only the parameters you can actually change
- **Session Management** - Automatic cookie-based auth with login lock for concurrent requests

---

## Quick Start

### Install via npx (recommended)

No installation needed. Configure your MCP client to run:

```bash
npx @disane-dev/weishaupt-wem-mcp-server
```

### Install from source

```bash
git clone https://github.com/Disane87/weishaupt-wem-mcp-server.git
cd weishaupt-wem-mcp-server
npm install
npm run build
```

---

## Configuration

<details open>
<summary><strong>Claude Desktop</strong></summary>

Add to your Claude Desktop config:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add weishaupt-wem -- npx -y @disane-dev/weishaupt-wem-mcp-server
```

Set the environment variables `WEM_USERNAME` and `WEM_PASSWORD` before starting.

</details>

<details>
<summary><strong>From source</strong></summary>

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

</details>

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WEM_USERNAME` | Yes | Your WEM Portal email |
| `WEM_PASSWORD` | Yes | Your WEM Portal password |
| `WEM_API_URL` | No | API base URL (default: `https://www.wemportal.com/app`) |

---

## Available Tools

| Tool | Description |
|---|---|
| `wem_get_devices` | List all devices with modules. **Call this first** to discover IDs. |
| `wem_get_device_status` | Get connection status of a device |
| `wem_get_overview` | Full device overview: all modules with all parameters in one call |
| `wem_get_parameters` | Get all parameters of a module with current values |
| `wem_get_parameter_meta` | Get parameter metadata (names, min/max, enums, writable flag) |
| `wem_get_writable_parameters` | List only adjustable parameters with ranges and options |
| `wem_read_parameters` | Read specific parameter values by ID |
| `wem_write_parameter` | Set a parameter value (e.g., target temperature) |

> [!TIP]
> Start with `wem_get_devices` to discover your `deviceId`, `moduleIndex`, and `moduleType`, then use `wem_get_overview` for a complete snapshot of your heating system.

---

## Typical Workflow

```
1. wem_get_devices
   -> Returns devices with modules (WE0=heat generator, HZK0=heating circuit, WW0=hot water)

2. wem_get_overview (deviceId)
   -> Returns ALL modules with ALL parameters in one call

3. wem_get_writable_parameters (deviceId, moduleIndex, moduleType)
   -> Shows what you can adjust, with min/max ranges

4. wem_write_parameter (deviceId, moduleIndex, moduleType, parameterId, numericValue)
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

---

## Development

| Command | Description |
|---|---|
| `npm run build` | Build the project |
| `npm run watch` | Watch mode (auto-rebuild on changes) |
| `npm start` | Run server directly |
| `npm test` | Test API connection |
| `npm run inspector` | Official MCP Inspector (Web UI) |
| `npm run inspector:cli -- devices` | CLI inspector for quick API tests |

---

## Troubleshooting

> [!NOTE]
> Make sure you can log in at [wemportal.com](https://www.wemportal.com/) before using this server.

| Issue | Solution |
|---|---|
| Authentication failed | Verify credentials, check if WEM Portal blocks after too many attempts |
| Connection timeout | Check internet, WEM Portal may be temporarily unavailable (30s default timeout) |
| Parameter values show 0 | Some parameters (e.g. room temperature) require a physical sensor connected to the device |

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

<!-- contrib:start -->
<div align="center">

<a href="https://github.com/Disane87/weishaupt-wem-mcp-server/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Disane87/weishaupt-wem-mcp-server" />
</a>

</div>
<!-- contrib:end -->

---

## License

MIT - see [LICENSE](LICENSE)

---

<div align="center">

**[disane.dev](https://disane.dev)** | **[Blog](https://blog.disane.dev)** | **[GitHub](https://github.com/Disane87)** | **[npm](https://www.npmjs.com/package/@disane-dev/weishaupt-wem-mcp-server)**

</div>

# Testing Guide

## Prerequisites

1. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

2. Configure credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your WEM Portal credentials
   ```

## Method 1: Automated Test

Runs login, device discovery, parameter reading, and logout in sequence:

```bash
npm test
```

## Method 2: CLI Inspector

Quick API testing from the command line:

```bash
# List all devices + modules
npm run inspector:cli -- devices

# Get device status
npm run inspector:cli -- status '{"deviceId": "20251"}'

# Get parameter metadata (names, writable flag, min/max)
npm run inspector:cli -- meta '{"deviceId": "20251", "moduleIndex": 0, "moduleType": 7}'

# Get all parameter values
npm run inspector:cli -- params '{"deviceId": "20251", "moduleIndex": 0, "moduleType": 7}'

# Read specific parameters
npm run inspector:cli -- read '{"deviceId": "20251", "moduleIndex": 0, "moduleType": 7, "parameterIds": ["Vorlauftemperatur", "Leistung"]}'

# Write a parameter
npm run inspector:cli -- write '{"deviceId": "20251", "moduleIndex": 0, "moduleType": 3, "parameterId": "NormalWW", "numericValue": 50}'
```

## Method 3: Official MCP Inspector (Web UI)

Tests the full MCP protocol including handshake, tool listing, and tool calls:

```bash
npm run inspector
```

This opens a web UI (usually at `http://localhost:6274`) where you can interactively test all tools.

## Method 4: Claude Desktop

1. Add to your Claude Desktop config (see [README.md](README.md#claude-desktop))
2. Restart Claude Desktop
3. Try: "What heating devices do I have?" or "Show me my heating parameters"

## Troubleshooting

| Issue | Solution |
|---|---|
| Authentication failed | Verify credentials in `.env`, test login at wemportal.com |
| Connection timeout | Check internet, WEM Portal may be temporarily unavailable |
| Parameter values are 0 | Some parameters require a physical sensor (e.g. room temperature) |
| MCP server not in Claude | Check JSON syntax, verify paths are absolute, restart Claude |

# 📊 MOCO MCP Server

A Model Context Protocol (MCP) server that provides employee read access to the MOCO API for time tracking, project management, holiday tracking, and presence monitoring.

## ⚡ Quick Start

Build the container and run the MCP server directly through Docker:

```bash
# 1. Pull the published stdio MCP image (used by most clients)
docker pull ghcr.io/migueltvms/moco-mcp-cli:latest

# 2. Run the server (stdin/stdout transport) with your credentials
docker run --rm -i \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  ghcr.io/migueltvms/moco-mcp-cli:latest
```

Prefer HTTP? Use the dedicated image instead:

```bash
docker build -f Dockerfile.http -t moco-mcp-http .
docker run --rm -p 8080:8080 \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  moco-mcp-http
```

The HTTP server exposes the MCP Streamable HTTP transport on `http://localhost:8080/sse`.

## 🚀 Installation

### Prerequisites

- Docker Engine ≥ 20.10
- MOCO account with API access
- MOCO API key and subdomain

### MCP Client Integration

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your Claude Desktop claude_desktop_config.json file:

**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "MOCO_API_KEY=your-moco-api-key",
        "-e", "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to your Cursor settings:

**MacOS:** `~/Library/Application Support/Cursor/User/settings.json`  
**Windows:** `%APPDATA%\Cursor\User\settings.json`  
**Linux:** `~/.config/Cursor/User/settings.json`

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "MOCO_API_KEY=your-moco-api-key",
        "-e", "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "MOCO_API_KEY=your-moco-api-key",
        "-e", "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

Add the MCP server to Claude Code:

```bash
claude mcp add \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  moco -- docker run --rm -i \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  ghcr.io/migueltvms/moco-mcp-cli:latest
```

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Configure Gemini CLI with MCP support:

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "MOCO_API_KEY=your-moco-api-key",
        "-e", "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Kiro</strong></summary>

1. Go to `Kiro` > `MCP Servers`
2. Add new MCP server by clicking `+ Add`
3. Paste the configuration below:

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "MOCO_API_KEY=your-moco-api-key",
        "-e",
        "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}

```

4. Click `Save` to apply changes

</details>

<details>
<summary><strong>LM Studio</strong></summary>

1. Go to `Program` (right side) > `Install` > `Edit mcp.json`
2. Paste the configuration below:

```json
{
  "mcpServers": {
    "moco": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "MOCO_API_KEY=your-moco-api-key",
        "-e", "MOCO_SUBDOMAIN=your-subdomain",
        "ghcr.io/migueltvms/moco-mcp-cli:latest"
      ],
       "env": {
          "MOCO_API_KEY": "your-moco-api-key",
          "MOCO_SUBDOMAIN": "your-subdomain"
       }
    }
  }
}
```

3. Click `Save` to apply changes
4. Toggle MCP server on/off from the right hand side (under `Program`) or by clicking the plug icon at the bottom of the chat box

</details>

## 🔑 MOCO API Setup

### Getting Your API Credentials

1. **Log into your MOCO account**
2. **Navigate to API settings:**
   - Go to **Profile** → **Integrations**

- Or visit: `https://your-subdomain.mocoapp.com/profile/integrations`

3. **Copy the listed API key**
4. **Note your subdomain:**
   - From your MOCO URL: `https://yourcompany.mocoapp.com`
   - Your subdomain is: `yourcompany`

### Environment Variables

You can set environment variables in several ways:

**Option 1: System Environment Variables**

```bash
export MOCO_API_KEY="your-moco-api-key"
export MOCO_SUBDOMAIN="your-subdomain"
```

**Option 2: .env File (for local development)**

```env
MOCO_API_KEY=your-moco-api-key
MOCO_SUBDOMAIN=your-subdomain
```

**Option 3: MCP Client Configuration (recommended)**
Use the `env` section in your MCP client configuration as shown above.

**Optional Environment Variables**

- `MOCO_API_CACHE_TIME` – Cache duration (in seconds) for list endpoints retrieved by the MCP server. Defaults to 300 (5 minutes). Set to `0` to disable caching.

## 🛠️ Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_activities` | Get activities within a date range with summation and optional project filtering | `startDate`, `endDate` (ISO 8601), `projectId` (optional) |
| `get_user_projects` | List all assigned projects or search by query | `query` (optional) |
| `get_user_project_tasks` | Get all tasks for a specific assigned project | `projectId` |
| `search_users` | Search the staff directory by name, email, role, unit, tags, or phone numbers | `query`, `includeArchived` (optional), `tags` (optional array) |
| `get_user_holidays` | Get holiday overview for a year with calculations | `year` |
| `get_user_presences` | Get presence data within a date range with daily summaries | `startDate`, `endDate` (ISO 8601) |
| `get_user_sick_days` | Get sick days overview for a year with calculations | `year` |
| `get_public_holidays` | Get public holidays for a year with working days calculations | `year` |

## 🎯 Available Prompts

The MoCo MCP server provides 8 intelligent prompts that orchestrate multiple tools to deliver comprehensive insights:

| Prompt | Description | Key Parameters |
|--------|-------------|----------------|
| `weekly_time_report` | Generates detailed weekly time tracking report with project breakdown | `week_start`, `include_billable_analysis` |
| `vacation_planning_assistant` | Assists with vacation planning by analyzing available days and holidays | `planned_start_date`, `planned_end_date` |
| `personal_productivity_insights` | Analyzes work habits and provides productivity recommendations | `analysis_period`, `focus_area` |
| `monthly_business_review` | Creates comprehensive business reports with trends and metrics | `month`, `year`, `include_comparisons` |
| `smart_work_life_balance_advisor` | Evaluates work-life balance with personalized recommendations | `analysis_weeks`, `target_hours_per_week` |
| `project_time_analysis` | Detailed project time analysis with efficiency metrics | `project_ids`, `time_period` |
| `team_capacity_overview` | Team capacity planning with absence and resource analysis | `planning_horizon`, `include_holidays` |
| `work_hours_compliance_check` | Compliance check for working time regulations | `check_period`, `max_weekly_hours`, `max_daily_hours` |

### Prompt Examples

**Weekly Time Report:**

```json
{
  "name": "weekly_time_report",
  "arguments": {
    "week_start": "2024-01-15",
    "include_billable_analysis": true
  }
}
```

**Vacation Planning:**

```json
{
  "name": "vacation_planning_assistant",
  "arguments": {
    "planned_start_date": "2024-07-15",
    "planned_end_date": "2024-07-29"
  }
}
```

**Work-Life Balance Analysis:**

```json
{
  "name": "smart_work_life_balance_advisor",
  "arguments": {
    "analysis_weeks": 6,
    "target_hours_per_week": 40
  }
}
```

**Compliance Check:**

```json
{
  "name": "work_hours_compliance_check",
  "arguments": {
    "check_period": "last_month",
    "max_weekly_hours": 48,
    "max_daily_hours": 10
  }
}
```

## 📝 Tool Examples

### Get Activities

**Filter all activities in a date range:**

```json
{
  "name": "get_activities",
  "arguments": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**Filter activities for a specific project:**

```json
{
  "name": "get_activities",
  "arguments": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "projectId": 123456
  }
}
```

**Sample Output:**

```
Activities from 2024-01-01 to 2024-01-31:

2024-01-15:
  Project 123 (Website Redesign):
    Task 456 (Frontend Development): 4.5h (4:30)
    Task 789 (Backend API): 3.25h (3:15)
    Project total: 7.75h (7:45)
  Daily total: 7.75h (7:45)

Grand total: 7.75h (7:45)
```

### Get User Projects

**List all assigned projects:**

```json
{
  "name": "get_user_projects",
  "arguments": {}
}
```

**Search projects:**

```json
{
  "name": "get_user_projects",
  "arguments": {
    "query": "website"
  }
}
```

### Get User Project Tasks

```json
{
  "name": "get_user_project_tasks",
  "arguments": {
    "projectId": 123456
  }
}
```

### Get User Holidays

```json
{
  "name": "get_user_holidays",
  "arguments": {
    "year": 2024
  }
}
```

**Sample Output:**

```
Holiday overview for 2024:

Taken holiday days:
- 2024-03-15: 1.0 day
- 2024-04-22: 0.5 day
- 2024-07-08: 1.0 day

Summary:
- Taken vacation: 2.5 days
- Annual entitlement: 25 days
- Utilization: 10% (2.5/25)
- Remaining vacation: 22.5 days
```

### Get User Presences

```json
{
  "name": "get_user_presences",
  "arguments": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-07"
  }
}
```

**Sample Output:**

```
Presences from 2024-01-01 to 2024-01-07:

Daily presences:
- 2024-01-01: 8.25h (8:15)
- 2024-01-02: 7.5h (7:30)
- 2024-01-03: 8.0h (8:00)

Grand total: 23.75h (23:45)

Statistics:
- Working days: 3
- Average per day: 7.92h (7:55)
```

### Get User Sick Days

```json
{
  "name": "get_user_sick_days",
  "arguments": {
    "year": 2024
  }
}
```

### Get Public Holidays

```json
{
  "name": "get_public_holidays",
  "arguments": {
    "year": 2024
  }
}
```

**Sample Output:**

```
Public holidays for 2024:

Holiday dates:
- 2024-01-01: New Year's Day
- 2024-04-01: Good Friday
- 2024-04-03: Easter Monday
- 2024-05-01: Labor Day
- 2024-05-09: Ascension Day
- 2024-05-20: Whit Monday
- 2024-10-03: German Unity Day
- 2024-12-25: Christmas Day
- 2024-12-26: Boxing Day

Summary:
- Total public holidays: 9 days
- Approximate working days: 251 days
```

## 🔧 Advanced Configuration

<details>
<summary><strong>Local Development</strong></summary>

If you want to run from source:

```bash
git clone https://github.com/MiguelTVMS/moco-mcp.git
cd moco-mcp
npm install
npm run build
npm start
```

Then configure your MCP client to use the local path:

```json
{
  "mcpServers": {
    "moco": {
      "command": "node",
      "args": ["/path/to/moco-mcp/dist/index.js"],
      "env": {
        "MOCO_API_KEY": "your-moco-api-key",
        "MOCO_SUBDOMAIN": "your-subdomain"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Expose HTTP Transport via ngrok</strong></summary>

Create a secure tunnel so external MCP clients can reach your local HTTP server.

1. Retrieve your ngrok authtoken from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken) and export it as `NGROK_AUTHTOKEN` (or add it to `.env`). Optional variables: `NGROK_REGION` and `NGROK_DOMAIN`.
2. Set `NGROK_ENABLED=true` in `.env` if you want the HTTP server to launch a tunnel automatically on startup (for example when using the compound VS Code launch).
3. Start the HTTP transport in one terminal:

  ```bash
  npm run dev:http
  ```

4. In a second terminal, launch the tunnel (skip this step if `NGROK_ENABLED=true` and you prefer the automatic tunnel):

  ```bash
  npm run tunnel:http
  ```

The script (or automatic tunnel) prints a public URL (e.g. `https://something.ngrok.app`) that forwards to `http://localhost:8080/sse`. Use that URL in your remote MCP client configuration. Stop the tunnel anytime with `Ctrl+C`.

</details>

<details>
<summary><strong>Docker Support</strong></summary>

Two container flavours are provided out of the box:

- `Dockerfile` (stdio transport): ideal when your MCP client expects a process that communicates over stdin/stdout.
- `Dockerfile.http` (HTTP transport): exposes the MCP Streamable HTTP interface for webhook-style integrations.

Build whichever image you need and run it with your MOCO credentials:

```bash
# stdio (published image)
docker pull ghcr.io/migueltvms/moco-mcp-cli:latest
docker run --rm -i -e MOCO_API_KEY=... -e MOCO_SUBDOMAIN=... ghcr.io/migueltvms/moco-mcp-cli:latest

# stdio (build from source)
docker build -t moco-mcp .
docker run --rm -i -e MOCO_API_KEY=... -e MOCO_SUBDOMAIN=... moco-mcp

# http
docker build -f Dockerfile.http -t moco-mcp-http .
docker run --rm -p 8080:8080 -e MOCO_API_KEY=... -e MOCO_SUBDOMAIN=... moco-mcp-http
```

</details>

## 🔍 Troubleshooting

### Common Issues

**❌ Authentication Error:**

```
API authentication failed. Please check MOCO_API_KEY.
```

- Verify your API key is correct and has necessary permissions
- Check if the API key is properly set in environment variables
- Ensure the key hasn't expired

**❌ Subdomain Error:**

```
MOCO_SUBDOMAIN should only contain the subdomain name
```

- Use only the subdomain part: `company` (not `company.mocoapp.com`)
- Remove `https://` and `.mocoapp.com` from the subdomain

**❌ Docker Image Not Found:**

```
Unable to find image 'ghcr.io/migueltvms/moco-mcp-cli:latest' locally
```

- Pull the image first: `docker pull ghcr.io/migueltvms/moco-mcp-cli:latest`
- Or double-check the tag you are referencing in your MCP client configuration.

**❌ Environment Variables Missing:**

```
API authentication failed. Please check MOCO_API_KEY.
```

- Ensure the `-e MOCO_API_KEY=...` and `-e MOCO_SUBDOMAIN=...` flags are present in your `docker run` command.
- For HTTP deployments, confirm the variables are set in your orchestrator or compose file.

**❌ MCP Client Not Finding Tools:**

- Restart your MCP client after configuration changes
- Check that environment variables are properly set
- Verify JSON configuration syntax is correct

### Debug Mode

For debugging, you can run the server with additional logging:

```bash
docker run --rm -i \
  -e NODE_ENV=development \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  ghcr.io/migueltvms/moco-mcp-cli:latest
```

### Testing Connection

You can test the server manually:

```bash
printf '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | \
docker run --rm -i \
  -e MOCO_API_KEY="your-moco-api-key" \
  -e MOCO_SUBDOMAIN="your-subdomain" \
  ghcr.io/migueltvms/moco-mcp-cli:latest
```

## 🌟 Features

- **✅ Read-only Access:** Safe API integration with no data modification
- **🔄 Automatic Pagination:** Handles large datasets seamlessly  
- **📊 Smart Aggregation:** Automatic summation by date, project, and task
- **🎯 Project Filtering:** Filter activities by specific projects
- **🧩 Comprehensive Tools:** 7 specialized tools for different use cases
- **🎯 Intelligent Prompts:** 8 AI-powered prompts for complex analysis and insights
- **🌐 Multi-Client Support:** Works with all major MCP clients

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **MOCO API Issues:** [MOCO API Documentation](https://github.com/hundertzehn/mocoapp-api-docs)
- **MCP Protocol:** [MCP Documentation](https://modelcontextprotocol.io/)
- **This Package:** [GitHub Issues](https://github.com/MiguelTVMS/moco-mcp/issues)

## 🙏 Acknowledgements

This package is based on the original work of David Seibert (nion digital). You can reach the original author at `david.seibert@nion-digital.com` or <https://www.nion-digital.com/>.

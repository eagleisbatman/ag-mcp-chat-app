# MCP Servers Configuration

## Available MCP Servers from nong_tri_workspace

### 1. Intent Classification MCP Server
- **URL:** `https://intent-classification-mcp.up.railway.app/mcp`
- **Tools:**
  - `classify_intent` - Classify user message intent
  - `extract_entities` - Extract crops, livestock, practices
  - `validate_crop` - Validate crop names
  - `validate_livestock` - Validate livestock names
- **Use Case:** Route messages to appropriate agents/tools

### 2. Tips MCP Server
- **URL:** `https://tips-mcp.up.railway.app/mcp`
- **Tools:**
  - `get_farming_tips` - Get farming tips by category/region/crop
  - `get_tip_categories` - List all tip categories
  - `get_tip_by_id` - Get specific tip by ID
- **Use Case:** Provide contextual farming tips

### 3. Content MCP Server
- **URL:** `https://content-mcp.up.railway.app/mcp`
- **Tools:**
  - `plan_weekly_content` - Plan content for upcoming week
  - `generate_podcast` - Generate podcast content
  - `generate_image_article` - Generate image article
- **Use Case:** Content generation for farmers

### 4. Profile Memory MCP Server
- **URL:** `https://profile-memory-mcp.up.railway.app/mcp`
- **Tools:**
  - `read_profile` - Read user profile
  - `update_profile` - Update profile fields
  - `add_memory_event` - Add memory event
  - `get_memory_summary` - Get memory summary
  - `extract_profile_facts` - Extract facts from conversation
- **Use Case:** User profile and conversation memory

### 5. Guardrails MCP Server
- **URL:** `https://guardrails-mcp.up.railway.app/mcp`
- **Tools:**
  - `check_input` - Check user input for safety
  - `check_output` - Check AI output for safety
- **Use Case:** Safety and policy enforcement

### 6. Traduora MCP Server
- **URL:** `https://traduora-mcp.up.railway.app/mcp`
- **Tools:**
  - `get_translations` - Get translations for project/language
  - `list_projects` - List all projects
  - `list_languages` - List languages for project
  - `create_translation_key` - Create translation key
  - `update_translation` - Update translation value
  - `export_translations` - Export translations as JSON
- **Use Case:** Translation management

### 7. AgriVision MCP Server (from GAP_PROTOTYPE)
- **URL:** `https://agrivision-mcp.up.railway.app/mcp`
- **Tools:**
  - `diagnose_plant_health` - Diagnose plant diseases/health
- **Use Case:** Plant disease diagnosis

### 8. Weather API MCP Server
- **URL:** `https://weatherapi-mcp.up.railway.app/mcp`
- **Tools:**
  - `get_weather_forecast` - Get weather forecast
  - `get_current_weather` - Get current weather
- **Use Case:** Weather information

## Region-Specific Servers (from GAP_PROTOTYPE)

### Ethiopia
- SSFR MCP: `https://ssfr-mcp.up.railway.app/mcp`
- ISDA Soil MCP: `https://isda-soil-mcp.up.railway.app/mcp`

### East Africa
- GAP Weather MCP: `https://gap-mcp.up.railway.app/mcp`
- Decision Tree MCP: `https://decision-tree-mcp.up.railway.app/mcp`

### Global
- AccuWeather MCP: `https://accuweather-mcp.up.railway.app/mcp`
- Feed Formulation MCP: `https://feed-formulation-mcp.up.railway.app/mcp`


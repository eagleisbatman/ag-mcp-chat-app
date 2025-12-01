# Use official n8n Docker image (as per https://docs.n8n.io/hosting/installation/docker/)
FROM docker.n8n.io/n8nio/n8n:latest

# Set environment variables per official n8n documentation
# Railway will override these with actual values from environment variables
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https

# Recommended n8n settings (from official docs)
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
ENV N8N_RUNNERS_ENABLED=true

# Timezone (set via Railway env vars: GENERIC_TIMEZONE and TZ)
# Example: GENERIC_TIMEZONE="America/New_York" TZ="America/New_York"

# Expose port
EXPOSE 5678

# Health check (n8n has built-in health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5678/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"


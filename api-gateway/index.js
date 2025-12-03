const express = require('express');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/chat';
const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main chat endpoint with API key auth
app.post('/api/chat', async (req, res) => {
  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling n8n:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});


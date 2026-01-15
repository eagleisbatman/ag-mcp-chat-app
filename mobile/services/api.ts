import { sendChatMessage } from './api/chat';
import { sendChatMessageStreaming } from './api/chatStreaming';
import { analyzePlantImage } from './api/diagnosis';
import { getActiveMcpServers, getAllMcpServersWithStatus, getMcpServersLiveStatus, getMcpServer } from './api/mcpServers';
import { detectRegions } from './api/regions';

export { sendChatMessage, sendChatMessageStreaming, analyzePlantImage };
export { getActiveMcpServers, getAllMcpServersWithStatus, getMcpServersLiveStatus, getMcpServer };
export { detectRegions };

export default {
  sendChatMessage,
  sendChatMessageStreaming,
  analyzePlantImage,
  getActiveMcpServers,
  getAllMcpServersWithStatus,
  getMcpServersLiveStatus,
  getMcpServer,
  detectRegions,
};

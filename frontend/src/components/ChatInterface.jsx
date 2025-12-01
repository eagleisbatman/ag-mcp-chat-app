import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

function ChatInterface({ deviceId, location, locationError, apiUrl }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: location 
          ? `Welcome! I'm your farming assistant. I see you're in ${location.city || location.country || 'your area'}. How can I help you today?`
          : 'Welcome! I'm your farming assistant. How can I help you today?',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [location]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.text,
          device_id: deviceId,
          latitude: location?.latitude,
          longitude: location?.longitude
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        text: data.response || 'I apologize, but I couldn\'t process your request.',
        sender: 'assistant',
        timestamp: new Date(),
        metadata: {
          region: data.region,
          mcp_server: data.mcp_server,
          tool_used: data.tool_used
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[Chat] Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <h1>🌾 FarmerChat</h1>
          <div className="header-info">
            {location && (
              <span className="location-badge">
                📍 {location.city || location.country || 'Location'}
              </span>
            )}
            {locationError && (
              <span className="location-warning">
                ⚠️ Using default location
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
              {message.metadata && (
                <div className="message-metadata">
                  <small>
                    {message.metadata.region && `Region: ${message.metadata.region}`}
                    {message.metadata.mcp_server && ` • ${message.metadata.mcp_server}`}
                  </small>
                </div>
              )}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message assistant-message typing-indicator">
            <div className="message-content">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input-container" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask about weather, crops, soil, farming..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;


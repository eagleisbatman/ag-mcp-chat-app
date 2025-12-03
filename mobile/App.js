import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// API Gateway URL (handles auth, proxies to n8n)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ag-mcp-gateway.up.railway.app/api/chat';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

const BOT_USER = {
  _id: 2,
  name: 'Farm Assistant',
  avatar: require('./assets/bot-avatar.png'),
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [location, setLocation] = useState({ latitude: -1.2864, longitude: 36.8172 });
  const [isTyping, setIsTyping] = useState(false);
  const [locationStatus, setLocationStatus] = useState('detecting');

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        _id: 1,
        text: 'Jambo! 🌱 I\'m your farming assistant.\n\nAsk me about:\n• Weather forecasts\n• Crop recommendations\n• Soil health\n• Plant diseases\n• Fertilizer advice',
        createdAt: new Date(),
        user: BOT_USER,
      },
    ]);

    // Get location
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationStatus('detected');
    } catch (error) {
      console.log('Location error:', error);
      setLocationStatus('error');
    }
  };

  const onSend = useCallback(async (newMessages = []) => {
    const userMessage = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));
    setIsTyping(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          message: userMessage.text,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const data = await response.json();

      const botMessage = {
        _id: Math.random().toString(),
        text: data.response || 'Sorry, I couldn\'t process that. Please try again.',
        createdAt: new Date(),
        user: BOT_USER,
      };

      setMessages(prev => GiftedChat.append(prev, [botMessage]));
    } catch (error) {
      console.log('API error:', error);
      const errorMessage = {
        _id: Math.random().toString(),
        text: 'Connection error. Please check your internet and try again.',
        createdAt: new Date(),
        user: BOT_USER,
      };
      setMessages(prev => GiftedChat.append(prev, [errorMessage]));
    } finally {
      setIsTyping(false);
    }
  }, [location]);

  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: '#4CAF50' },
        left: { backgroundColor: '#F5F5F5' },
      }}
      textStyle={{
        right: { color: '#FFFFFF' },
        left: { color: '#333333' },
      }}
    />
  );

  const renderInputToolbar = (props) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={styles.inputPrimary}
    />
  );

  const renderSend = (props) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <View style={styles.sendButton}>
        <Text style={styles.sendText}>Send</Text>
      </View>
    </Send>
  );

  const renderFooter = () => {
    if (isTyping) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.footerText}>Thinking...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌾 Farm Assistant</Text>
          <Text style={styles.headerSubtitle}>
            {locationStatus === 'detected' ? '📍 Location detected' : 
             locationStatus === 'detecting' ? '📍 Detecting...' : 
             '📍 Using default location'}
          </Text>
        </View>

        {/* Chat */}
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: 1 }}
          placeholder="Ask about weather, crops, soil..."
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          renderFooter={renderFooter}
          alwaysShowSend
          scrollToBottom
          isTyping={isTyping}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E8F5E9',
    marginTop: 4,
  },
  inputToolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    marginBottom: 4,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  footerText: {
    marginLeft: 8,
    color: '#666666',
    fontSize: 14,
  },
});


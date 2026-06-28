import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', paddingTop: 50 }}>
      <Text style={{ color: '#00e5ff', fontSize: 24, textAlign: 'center', margin: 20 }}>
        HELLO LOCALCHIMERA
      </Text>
      {ready && (
        <WebView
          source={{ uri: 'https://new.localchimera.com/inference/' }}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
      )}
    </View>
  );
}

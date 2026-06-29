import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function App() {
  const [dir, setDir] = useState('loading');

  useEffect(() => {
    try {
      setDir(String(FileSystem.documentDirectory || 'null'));
    } catch (e) {
      setDir('Error: ' + e.message);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', paddingTop: 100 }}>
      <Text style={{ color: '#00e5ff', fontSize: 24, textAlign: 'center', margin: 20 }}>
        FileSystem Test
      </Text>
      <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', margin: 20 }}>
        {dir}
      </Text>
    </View>
  );
}

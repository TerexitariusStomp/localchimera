import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { loadModel, completion, BITNET_0_7B_INST_TQ2_0 } from '@qvac/sdk';

export default function App() {
  const [modelStatus, setModelStatus] = useState('idle');
  const [frontendUri, setFrontendUri] = useState(null);
  const [modelId, setModelId] = useState(null);
  const [modelError, setModelError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletInput, setWalletInput] = useState('');
  const [walletError, setWalletError] = useState('');
  const webViewRef = useRef(null);
  const bridgeResolvers = useRef(new Map());

  // Load frontend immediately (never block UI on model)
  useEffect(() => {
    async function initFrontend() {
      try {
        const asset = await Asset.fromModule(require('./assets/frontend/index.html'));
        setFrontendUri(asset.localUri || asset.uri);
      } catch (e) {
        console.error('Frontend load error:', e);
        setFrontendUri('');
      }
    }
    initFrontend();
  }, []);

  // Load model on user request only — prevents startup crash from killing the app
  async function loadLLM() {
    if (modelStatus === 'loading') return;
    setModelStatus('loading');
    setModelError(null);
    try {
      const mid = await loadModel({
        modelSrc: BITNET_0_7B_INST_TQ2_0,
        modelType: 'llm',
        onProgress: (p) => {
          setModelStatus(`loading model: ${Math.round(p * 100)}%`);
        },
      });
      setModelId(mid);
      setModelStatus('ready');
    } catch (e) {
      console.error('Model load error:', e);
      setModelStatus('error');
      setModelError(e.message || 'Failed to load model');
      throw e;
    }
  }

  async function ensureModelLoaded() {
    if (!modelId) {
      await loadLLM();
    }
    if (!modelId) throw new Error('Model not loaded');
  }

  async function handleStart(body) {
    const address = body?.evmAddress || body?.walletAddress || null;
    if (address) setWalletAddress(address);
    await loadLLM();
    return { success: true, data: { started: true, walletAddress: address } };
  }

  const onStartPress = async () => {
    setWalletError('');
    const addr = walletInput.trim();
    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      setWalletError('Enter a valid 42-character EVM address (0x...)');
      return;
    }
    setWalletAddress(addr);
    await loadLLM();
  };

  async function handleAIWrite(body) {
    await ensureModelLoaded();
    const history = [{ role: 'user', content: body.prompt }];
    const result = completion({ modelId, history, stream: false });
    let generated = '';
    for await (const token of result.tokenStream) {
      generated += token;
    }
    return {
      success: true,
      data: {
        title: body.title || 'Generated',
        body: generated,
        source: 'qvac-on-device',
        model: 'BITNET_0_7B_INST_TQ2_0',
      },
    };
  }

  async function handleAIStatus() {
    return {
      success: true,
      data: {
        available: true,
        qvacAvailable: !!modelId,
        model: modelId ? 'BITNET_0_7B_INST_TQ2_0' : null,
        modelLoading: !modelId && modelStatus !== 'ready' && modelStatus !== 'error',
        modelStatus,
        modelError,
      },
    };
  }

  async function handleAIDocs() {
    return { success: true, data: [] };
  }

  async function resolveBridge(id, res) {
    try {
      webViewRef.current?.injectJavaScript(`
        window.__bridgeResolve(${id}, ${JSON.stringify(res)});
        true;
      `);
    } catch (e) {
      console.error('Bridge resolve error:', e);
    }
  }

  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'bridge-ready') return;

      const { id, method, path, body } = msg;
      let res;

      try {
        if (method === 'POST' && path === '/api/start') {
          res = await handleStart(body);
        } else if (method === 'POST' && path === '/api/ai-write') {
          res = await handleAIWrite(body);
        } else if (method === 'GET' && path === '/api/ai-status') {
          res = await handleAIStatus();
        } else if (method === 'GET' && path === '/api/ai-docs') {
          res = await handleAIDocs();
        } else {
          res = { success: false, error: 'Not found' };
        }
      } catch (e) {
        console.error('Bridge handler error:', e);
        res = { success: false, error: e.message || 'Handler failed' };
      }

      resolveBridge(id, res);
    } catch (e) {
      console.error('Bridge error:', e);
    }
  };

  const injectedBridge = `
    (function() {
      if (window.__bridgeActive) return;
      window.__bridgeActive = true;
      window.__bridgeFetch = true;
      window.__bridgeResolvers = {};
      window.__bridgeResolve = function(id, data) {
        const cb = window.__bridgeResolvers[id];
        if (cb) cb(data);
        delete window.__bridgeResolvers[id];
      };

      const originalFetch = window.fetch;
      const isApiCall = (url) => {
        if (typeof url !== 'string') return false;
        return url.startsWith('/api') || url.startsWith('http://localhost:3002/api');
      };
      const extractPath = (url) => {
        if (url.startsWith('/api')) return url;
        return url.replace('http://localhost:3002', '');
      };

      window.fetch = async function(url, options = {}) {
        if (isApiCall(url)) {
          return new Promise((resolve, reject) => {
            const id = Date.now() + Math.random();
            const body = options.body ? JSON.parse(options.body) : {};
            window.__bridgeResolvers[id] = (res) => {
              resolve(new Response(JSON.stringify(res), {
                status: res.success ? 200 : 500,
                headers: { 'Content-Type': 'application/json' }
              }));
            };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              id, method: options.method || 'GET', path: extractPath(url), body
            }));
            setTimeout(() => {
              if (window.__bridgeResolvers[id]) {
                delete window.__bridgeResolvers[id];
                reject(new Error('Bridge timeout'));
              }
            }, 120000);
          });
        }
        return originalFetch(url, options);
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bridge-ready' }));
    })();
  `;

  if (!frontendUri) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={styles.text}>Loading Chimera...</Text>
      </View>
    );
  }

  if (frontendUri === '') {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, { color: '#ff6b6b' }]}>Failed to load frontend assets</Text>
      </View>
    );
  }

  // Setup screen: shown until the model is loaded for the first time.
  // Wallet address + Start loads the model. After that, the web frontend takes over.
  if (modelStatus !== 'ready') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Chimera</Text>
          <Text style={styles.setupSubtitle}>Start your local AI device</Text>
          <TextInput
            style={[styles.walletInput, walletError ? styles.walletInputError : null]}
            placeholder="0x... EVM wallet address"
            placeholderTextColor="#7a7468"
            value={walletInput}
            onChangeText={setWalletInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {walletError ? <Text style={styles.errorText}>{walletError}</Text> : null}
          {modelStatus === 'error' ? <Text style={styles.errorText}>Model error: {modelError}</Text> : null}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={onStartPress}
            disabled={modelStatus === 'loading'}
          >
            {modelStatus === 'loading' ? (
              <ActivityIndicator size="small" color="#0a0a14" />
            ) : (
              <Text style={styles.startBtnText}>▶ Start</Text>
            )}
          </TouchableOpacity>
          {modelStatus === 'loading' && (
            <Text style={styles.loadingText}>{modelStatus}</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: frontendUri }}
        style={styles.webview}
        injectedJavaScript={injectedBridge}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    width: '100%',
  },
  text: {
    color: '#e8e2d8',
    marginTop: 16,
    fontSize: 14,
  },
  setupCard: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#0b0a09',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'stretch',
  },
  setupTitle: {
    color: '#e8e2d8',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  setupSubtitle: {
    color: '#7a7468',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  walletInput: {
    backgroundColor: '#0a0a12',
    color: '#e8e2d8',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  walletInputError: {
    borderColor: '#b91c1c',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    marginBottom: 10,
  },
  startBtn: {
    backgroundColor: '#c9a96e',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#0e0d0b',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: '#7a7468',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

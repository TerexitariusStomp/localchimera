export interface OnnxInferencePlugin {
  loadModel(options: { modelPath: string }): Promise<{ success: boolean; message: string }>;
  runInference(options: { input: string; maxTokens?: number }): Promise<{ output: string; tokensGenerated: number; durationMs: number }>;
  getDeviceInfo(): Promise<{ platform: string; hasNeuralEngine: boolean; modelLoaded: boolean }>;
}

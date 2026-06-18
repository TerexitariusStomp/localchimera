import { registerPlugin } from '@capacitor/core';
import type { OnnxInferencePlugin } from './definitions';

const OnnxInference = registerPlugin<OnnxInferencePlugin>('OnnxInference');

export * from './definitions';
export { OnnxInference };

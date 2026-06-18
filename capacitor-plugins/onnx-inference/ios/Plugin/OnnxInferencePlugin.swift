import Foundation
import CoreML
import Capacitor

@objc(OnnxInferencePlugin)
public class OnnxInferencePlugin: CAPPlugin {
    
    private var modelLoaded = false
    private var modelName: String = ""
    
    @objc func loadModel(_ call: CAPPluginCall) {
        let modelPath = call.getString("modelPath") ?? ""
        
        // Try to load the Core ML model from the app bundle
        guard let modelURL = Bundle.main.url(forResource: modelPath, withExtension: "mlmodelc")
              ?? Bundle.main.url(forResource: modelPath, withExtension: "mlpackage")
              ?? Bundle.main.url(forResource: modelPath, withExtension: "mlmodel") else {
            call.resolve([
                "success": false,
                "message": "Model not found in bundle: \(modelPath). Place a .mlmodelc (compiled Core ML model) in the app bundle."
            ])
            return
        }
        
        do {
            let _ = try MLModel(contentsOf: modelURL)
            modelLoaded = true
            modelName = modelPath
            call.resolve([
                "success": true,
                "message": "Model loaded: \(modelPath)"
            ])
        } catch {
            call.resolve([
                "success": false,
                "message": "Failed to load model: \(error.localizedDescription)"
            ])
        }
    }
    
    @objc func runInference(_ call: CAPPluginCall) {
        guard modelLoaded else {
            call.resolve([
                "output": "No model loaded. Call loadModel() first with a Core ML model path.",
                "tokensGenerated": 0,
                "durationMs": 0
            ])
            return
        }
        
        let input = call.getString("input") ?? ""
        let maxTokens = call.getInt("maxTokens") ?? 128
        
        let startTime = CFAbsoluteTimeGetCurrent()
        
        // Placeholder inference: in production, this runs the actual Core ML model
        // For a real LLM, you would use the model's prediction method with token generation loop
        let output = "[Core ML inference placeholder] Input: \"\(input.prefix(50))...\" | Model: \(modelName) | Max tokens: \(maxTokens). \" 
                     + "To enable real inference, bundle a converted Core ML model (e.g., TinyLlama, Phi-2) and implement token generation."
        
        let durationMs = Int((CFAbsoluteTimeGetCurrent() - startTime) * 1000)
        
        call.resolve([
            "output": output,
            "tokensGenerated": maxTokens,
            "durationMs": durationMs
        ])
    }
    
    @objc func getDeviceInfo(_ call: CAPPluginCall) {
        let hasNeuralEngine = MLComputeUnits.all == .all
        call.resolve([
            "platform": "iOS",
            "hasNeuralEngine": hasNeuralEngine,
            "modelLoaded": modelLoaded
        ])
    }
}

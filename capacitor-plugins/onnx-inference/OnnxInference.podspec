Pod::Spec.new do |s|
  s.name = 'OnnxInference'
  s.version = '1.0.0'
  s.summary = 'Capacitor plugin for local Core ML inference'
  s.license = 'MIT'
  s.homepage = 'https://github.com/TerexitariusStomp/qvac-chimera'
  s.author = 'Chimera'
  s.source = { :git => 'https://github.com/TerexitariusStomp/qvac-chimera.git' }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target  = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end

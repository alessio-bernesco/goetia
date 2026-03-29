// Demon vertex shader — glow, pulse, noise displacement

uniform float uTime;
uniform float uPulseFrequency;
uniform float uNoiseAmplitude;
uniform float uScaleFactor;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

// Simple noise
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Pulse
  float pulse = sin(uTime * uPulseFrequency * 6.28318) * 0.02 + 1.0;

  // Noise displacement
  float n = noise(position * 3.0 + uTime * 0.5) * uNoiseAmplitude;
  vDisplacement = n;

  vec3 displaced = position + normal * n;
  displaced *= pulse * uScaleFactor;

  vPosition = displaced;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}

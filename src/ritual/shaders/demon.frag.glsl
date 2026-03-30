// Demon fragment shader — glow, wireframe emissive, color modulation

uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uColorShift;
uniform float uGlowIntensity;
uniform float uOpacity;
uniform float uValence;
uniform float uSpeaking;
uniform float uWaiting;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  // Base color with color shift modulation
  vec3 color = uBaseColor * uColorShift;

  // Valence-based temperature shift (negative = cool/blue, positive = warm/red)
  color += vec3(max(uValence, 0.0) * 0.2, 0.0, max(-uValence, 0.0) * 0.2);

  // Fresnel glow (edge glow effect)
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  fresnel = pow(fresnel, 3.0);

  // Glow emission
  vec3 glowColor = color * uGlowIntensity * 2.0;
  color += glowColor * fresnel;

  // Noise-based subtle variation
  color += vDisplacement * 0.3;

  // Waiting: slow glow pulse (breathing)
  color += glowColor * uWaiting * 0.2 * (0.5 + sin(uTime * 5.0) * 0.5);

  // Speaking: subtle glow boost + opacity flicker
  color += glowColor * uSpeaking * 0.3;
  float flicker = sin(uTime * 17.0) * sin(uTime * 23.0) * 0.08 * uSpeaking;

  // Pulsing opacity variation
  float alpha = uOpacity * (0.9 + sin(uTime * 2.0) * 0.1 + flicker);

  gl_FragColor = vec4(color, alpha);
}

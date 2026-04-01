// Shockwave post-processing — radial ring distortion
// Used for prince evocation (expanding) and banishment (contracting)

uniform sampler2D tDiffuse;
uniform vec2 uCenter;       // UV space center (0.5, 0.5)
uniform float uRadius;      // current wave radius (0 to 2)
uniform float uIntensity;   // distortion strength (decays over time)
uniform float uWidth;        // ring thickness

varying vec2 vUv;

void main() {
  vec2 dir = vUv - uCenter;
  float dist = length(dir);

  // Ring-shaped distortion around the current radius
  float ring = smoothstep(uRadius - uWidth, uRadius, dist)
             - smoothstep(uRadius, uRadius + uWidth, dist);

  // Push pixels outward along the radial direction
  vec2 offset = normalize(dir + 0.0001) * ring * uIntensity * 0.1;

  // Slight chromatic aberration for extra punch
  float r = texture2D(tDiffuse, vUv + offset * 1.1).r;
  float g = texture2D(tDiffuse, vUv + offset).g;
  float b = texture2D(tDiffuse, vUv + offset * 0.9).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}

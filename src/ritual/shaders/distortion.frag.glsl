// Spatial distortion + heavy chromatic aberration
// Combines: barrel warp, horizontal wave displacement, chromatic split, vignette

uniform sampler2D tDiffuse;
uniform float uDistortion;   // 0-1 intensity
uniform vec2 uCenter;        // distortion center (UV space)

varying vec2 vUv;

void main() {
  float d = uDistortion;
  vec2 uv = vUv;

  // Horizontal wave displacement — visible even on sparse point clouds
  // Multiple overlapping sine waves at different scales
  float wave1 = sin(uv.y * 30.0 + d * 20.0) * d * 0.015;
  float wave2 = sin(uv.y * 80.0 - d * 40.0) * d * 0.008;
  float wave3 = sin(uv.y * 150.0 + d * 10.0) * d * d * 0.005;
  uv.x += wave1 + wave2 + wave3;

  // Vertical wave (subtler)
  float vwave = sin(uv.x * 40.0 + d * 15.0) * d * 0.008;
  uv.y += vwave;

  // Barrel distortion — pulls edges inward
  vec2 delta = uv - uCenter;
  float r2 = dot(delta, delta);
  float barrel = 1.0 + d * r2 * 4.0 + d * r2 * r2 * 8.0;
  uv = uCenter + delta * barrel;

  // Chromatic aberration — wide RGB split, scales with distortion
  float chrOffset = d * 0.02;
  vec2 chrDir = normalize(uv - uCenter + 0.0001);

  float r = texture2D(tDiffuse, uv + chrDir * chrOffset * 1.5).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - chrDir * chrOffset * 1.5).b;

  // Vignette
  vec2 vigUV = vUv - 0.5;
  float vignette = 1.0 - dot(vigUV, vigUV) * d * 2.5;

  gl_FragColor = vec4(r * vignette, g * vignette, b * vignette, 1.0);
}

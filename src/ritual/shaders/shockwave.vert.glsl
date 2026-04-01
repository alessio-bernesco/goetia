// Fullscreen quad vertex shader for shockwave post-processing
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

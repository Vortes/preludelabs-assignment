// Shared by refractive lenses and transparent UI highlights.
export const specularGLSL = `
float specularHighlight(float distanceToEdge, vec2 normal, float angle, float intensity, float softness) {
  // Align the 180-degree reference setting with the observed top/bottom rim.
  vec2 light=vec2(cos(radians(angle-90.)),sin(radians(angle-90.)));
  float facing=dot(normal,light);
  float reflection=pow(max(facing,0.),2.)+pow(max(-facing,0.),2.)*.25;
  float rim=exp(-max(-distanceToEdge,0.)/max(softness,.25));
  float coverage=1.-smoothstep(-.5,.5,distanceToEdge);
  return clamp(reflection*rim*coverage*intensity/100.,0.,1.);
}
`;

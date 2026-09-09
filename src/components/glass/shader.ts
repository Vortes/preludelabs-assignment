import { specularGLSL } from "./specular-shader";

export const vertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

// Pattern equations and parameter mappings ported from the authored Figma WGSL.
// Native GLASS is a separate browser approximation; see docs/glass-workbench.md.
export const fragmentShader = `
precision highp float;
varying vec2 uv;
uniform sampler2D artwork;
uniform vec2 dimensions, imageOffset, pixelStep;
uniform float textureSize;
uniform float imageSize, radius, refraction, depth, dispersion, frost, splay, lightAngle, lightIntensity, enabled;
uniform float patternEnabled, patternType, strength, patternScale, patternAngle, patternX, patternY, patternDispersion, patternFrost, smoothness, wrap;
const float PI = 3.14159265359;
${specularGLSL}
float sdf(vec2 p) {
  vec2 q = abs(p) - (dimensions*.5 - radius);
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - radius;
}
// Smooth the optical field's medial-axis joins; retain the exact SDF for clipping.
float opticalSdf(vec2 p) {
 vec2 q=abs(p)-(dimensions*.5-radius);
 float k=max(1.,min(dimensions.x,dimensions.y)*.06);
 float h=max(k-abs(q.x-q.y),0.)/k;
 float roundedMax=max(q.x,q.y)+h*h*k*.25;
 return length(max(q,0.))+min(roundedMax,0.)-radius;
}
vec3 scene(vec2 p) {
  vec2 t=(p-imageOffset)/imageSize;
  vec2 edge=min(t,1.-t);
  float coverage=smoothstep(-.5/textureSize,.5/textureSize,min(edge.x,edge.y));
  vec4 texel=texture2D(artwork,clamp(t,0.,1.));
  return mix(vec3(.025),texel.rgb,texel.a*coverage);
}
vec3 frosted(vec2 p) {
 return scene(p)*.4+(scene(p+vec2(frost,0.))+scene(p-vec2(frost,0.))+scene(p+vec2(0.,frost))+scene(p-vec2(0.,frost)))*.15;
}
// A convex squircle bezel. Height and its derivative define the surface normal;
// Snell's law then projects the ray onto the artwork plane (kube.io article).
float surfaceHeight(float t) {
 return pow(max(0.,1.-pow(1.-clamp(t,0.,1.),4.)),.25);
}
vec2 rayOffset(vec2 normalXY, float slope, float thickness, float index) {
 vec3 normal=normalize(vec3(normalXY*slope,1.));
 vec3 ray=refract(vec3(0.,0.,-1.),normal,1./index);
 return ray.xy/max(.001,-ray.z)*thickness;
}
vec4 glass(vec2 p) {
 vec2 local=p-dimensions*.5;
 float d=sdf(local);
 float mask=1.-smoothstep(-.6,.6,d);
 vec2 gradient=vec2(opticalSdf(local+vec2(.1,0.))-opticalSdf(local-vec2(.1,0.)),opticalSdf(local+vec2(0.,.1))-opticalSdf(local-vec2(0.,.1)));
 vec2 n=gradient/max(length(gradient),.00001);
 float bezel=max(1.,min(dimensions.x,dimensions.y)*.5*mix(.12,1.,splay/100.));
 float t=clamp(-opticalSdf(local)/bezel,0.,1.);

 float slope=pow(1.-t,3.)/max(pow(surfaceHeight(t),3.),.001);
 // Depth is an artistic 0–100 control, not a pixel distance in Figma.
 // Splay fans the normals and tapers the optical path toward the side centers.
 // The scale is calibrated in design pixels against the wide Figma lens.
 float spread=splay/100.;
 float sideTaper=mix(1.,n.y*n.y,smoothstep(1.,2.,dimensions.x/dimensions.y)*spread);
 vec2 radial=local/(dimensions*.5);
 vec2 fanned=n+radial*spread*(1.-t);
 n=fanned/max(length(fanned),.00001);
 float thickness=depth*2.*mix(1.,abs(radial.y),spread*.85)*sideTaper;
 float index=1.+refraction/100.*.5;
 // Artistic dispersion spans a wider range than physical glass to match Figma.
 float spectralSpread=dispersion/100.*(index-1.)*.4;
 vec2 red=rayOffset(n,slope,thickness,index+spectralSpread);
 vec2 green=rayOffset(n,slope,thickness,index);
 vec2 blue=rayOffset(n,slope,thickness,max(1.,index-spectralSpread));
 vec3 color=vec3(frosted(p+red).r,frosted(p+green).g,frosted(p+blue).b);
 color=mix(color,vec3(1.),.05098);
 float highlight=specularHighlight(d,gradient/max(length(gradient),.00001),lightAngle,lightIntensity,1.2);
 return vec4(mix(color,vec3(1.),highlight),mask);
}
float hash3(vec3 p) { p=fract(p*.3183099+vec3(.1)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 p) {
 vec3 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),u.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),u.x),u.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),u.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),u.x),u.y),u.z);
}
float heightAt(vec2 p) {
 vec2 pos=p-vec2(patternX,patternY)/100.*dimensions;
 float a=-radians(patternAngle); pos=mat2(cos(a),sin(a),-sin(a),cos(a))*pos;
 pos/=20.+patternScale/100.*980.;
 if(patternType==2.) pos.x+=sin(pos.y*.15*2.*PI)*.6;
 else if(patternType==1.) pos.x+=(abs(fract(pos.y*.15)*2.-1.)*2.-1.)*.6;
 vec2 g=fract(pos)*2.-1.; float h=1.;
 if(patternType<3.) h=pow(max(0.,sin((g.x*.5+.5)*PI)),.7);
 else if(patternType==3.) h=1.-dot(g,g);
 else if(patternType==4.) h=1.-max(abs(g.x),abs(g.y))*dot(g,g)*.8;
 else {vec2 d=abs(g*1.125)-vec2(.5);h=1.-clamp(length(max(d,0.))+max(d.x,d.y),0.,1.);}
 h=clamp(h,0.,1.); h*=pow(h,max(.001,smoothness/100.));
 if(patternFrost>.001) h+=(vnoise(vec3(p*.5,1.))-.5)*patternFrost/100.*.1;
 return h;
}
vec4 wrappedGlass(vec2 p) {
 if(wrap==0. && (p.x<0. || p.y<0. || p.x>dimensions.x || p.y>dimensions.y)) return vec4(0.);
 if(wrap==2.) p=fract(p/dimensions)*dimensions;
 else if(wrap==3.) { vec2 m=fract(p/dimensions*.5)*2.;p=(1.-abs(m-1.))*dimensions; }
 else p=clamp(p,vec2(0.),dimensions);
 return glass(p);
}
void main() {
 vec2 p=vec2(uv.x,1.-uv.y)*dimensions;
 if(enabled<.5) {gl_FragColor=vec4(0.);return;}
 if(patternEnabled<.5) {
   vec4 clear=vec4(0.);
   for(int i=0;i<2;i++) for(int j=0;j<2;j++) {
     vec2 samplePoint=p+(vec2(float(i),float(j))-.5)*pixelStep*.5;
     vec4 sampleColor=glass(samplePoint);
     clear+=vec4(sampleColor.rgb*sampleColor.a,sampleColor.a);
   }
   clear*=.25;
   gl_FragColor=vec4(clear.rgb/max(clear.a,.00001),clear.a);
   return;
 }
 vec4 accum=vec4(0.);
 // Integrate over the actual framebuffer pixel footprint, including CSS scaling.
 for(int i=0;i<2;i++) for(int j=0;j<2;j++) {
   vec2 sp=p+(vec2(float(i),float(j))-.5)*pixelStep*.5;
   float h=heightAt(sp);
   vec3 n=normalize(vec3(h-vec2(heightAt(sp+vec2(.125,0.)),heightAt(sp+vec2(0.,.125))),.0125));
   float chroma=patternDispersion/100.*.25;
   vec2 r=refract(vec3(0,0,-1),n,1.333+chroma).xy*strength*10.;
   vec2 g=refract(vec3(0,0,-1),n,1.333).xy*strength*10.;
   vec2 b=refract(vec3(0,0,-1),n,1.333-chroma).xy*strength*10.;
   vec4 cr=wrappedGlass(p+r),cg=wrappedGlass(p+g),cb=wrappedGlass(p+b);
   accum+=vec4(cr.r,cg.g,cb.b,cg.a);
 }
 gl_FragColor=accum/4.;
}
`;

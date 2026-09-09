export const cubeVertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
`;

export const cubeFragmentShader = `
precision highp float;
varying vec2 uv;
uniform sampler2D artwork, lensTexture0, lensTexture1, lensTexture2, lensTexture3;
uniform vec2 lensDimensions;
uniform float lensCenterY;
uniform float progress, orbit, cameraDistance, cubeSize, cubeDepth;
uniform float restWidth, restHeight, focalY, artworkScale, glassTint, edgeLight;
const float PI=3.14159265359;
float roundedBox(vec2 p,vec2 halfSize,float r) {
 vec2 q=abs(p)-halfSize+r;
 return length(max(q,0.))+min(max(q.x,q.y),0.)-r;
}
vec3 environment(vec2 p) {
 float mist=sin(p.x*.009+sin(p.y*.013))*sin(p.y*.007+sin(p.x*.006));
 float glow=exp(-dot(p/vec2(750.,570.),p/vec2(750.,570.)));
 return vec3(.018,.022,.024)+glow*.013+mist*.003;
}
vec4 imageAt(vec2 p) {
 float size=600.*mix(1.,artworkScale,progress);
 float mask=1.-smoothstep(-.8,.8,roundedBox(p,vec2(size*.5),size*.065));
 vec2 t=vec2(p.x/size+.5,.5-p.y/size);
 return vec4(texture2D(artwork,clamp(t,.001,.999)).rgb,mask);
}
vec3 sceneAt(vec2 p,float blur) {
 vec4 a=imageAt(p);
 vec3 rgb=a.rgb;
 if(blur>.01) {
  rgb=(rgb*4.+imageAt(p+vec2(blur,0)).rgb+imageAt(p-vec2(blur,0)).rgb+imageAt(p+vec2(0,blur)).rgb+imageAt(p-vec2(0,blur)).rgb)/8.;
 }
 return mix(environment(p),rgb,a.a);
}
vec3 normalFor(float face) {float angle=face*PI*.5+orbit;return vec3(sin(angle),0.,cos(angle));}
vec2 halfSize(float face) {float focus=(1.-progress)*smoothstep(.6,.95,normalFor(face).z);return mix(vec2(cubeSize),vec2(restWidth,restHeight),focus)*.5;}
vec4 hitPlane(vec3 eye,vec3 ray,float face) {
 vec3 n=normalFor(face), right=vec3(n.z,0.,-n.x);
 float depth=mix(mix(310.,26.,smoothstep(.6,.95,n.z)),cubeDepth,progress);
 vec3 center=n*depth+vec3(0.,600.*(.5-focalY)*(1.-progress)*smoothstep(.6,.95,n.z),0.);
 float denom=dot(ray,n);
 if(abs(denom)<.0001)return vec4(-1.,face,0.,0.);
 float distance=dot(center-eye,n)/denom;
 vec3 p=eye+distance*ray-center;
 vec2 local=vec2(dot(p,right),p.y);
 if(distance<0. || roundedBox(local,halfSize(face),min(44.,halfSize(face).y*.3))>1.)return vec4(-1.,face,0.,0.);
 return vec4(distance,face,local);
}
void orderHits(inout vec4 a,inout vec4 b) {if(a.x<b.x){vec4 temp=a;a=b;b=temp;}}
vec4 faceOptics(float face,vec2 point) {
 if(face<.5)return texture2D(lensTexture0,point);
 if(face<1.5)return texture2D(lensTexture1,point);
 if(face<2.5)return texture2D(lensTexture2,point);
 return texture2D(lensTexture3,point);
}
vec3 compositePlane(vec3 color,vec4 hit,vec3 eye,vec3 ray,float imageDistance,vec2 imagePoint) {
 if(hit.x<0.)return color;
 vec2 local=hit.zw, extent=halfSize(hit.y);
 float d=roundedBox(local,extent,min(44.,extent.y*.3));
 float mask=1.-smoothstep(-.8,.8,d);
 vec3 n=normalFor(hit.y);
 float frontness=abs(n.z);
 // Only the forward lens survives collapse; other cube faces disappear with expansion.
 float visibility=mix(smoothstep(.6,.95,n.z),1.,progress);
 // Artwork is an opaque surface at z=0. Rear faces never refract it.
 if(hit.x>imageDistance)mask*=1.-imageAt(imagePoint).a;
 vec3 tint=environment(imagePoint)+glassTint*vec3(.45,.48,.5);
 vec3 result=mix(color,tint,.65*visibility);
 if(hit.x<imageDistance) {
   vec2 lensUV=local/(extent*2.)+.5;
   if(all(greaterThanEqual(lensUV,vec2(0.))) && all(lessThanEqual(lensUV,vec2(1.)))) {
     vec4 optical=faceOptics(hit.y,lensUV);
     // Expanded faces filter only the artwork beneath them. The original wide
     // resting lens retains its authored edge diffraction during collapse.
     float artworkCoverage=mix(1.,imageAt(imagePoint).a,progress);
     result=mix(result,optical.rgb,optical.a*artworkCoverage);
   }

 }
 float edge=exp(-abs(d)*1.3)*edgeLight;
 vec3 spectrum=.5+.5*cos(vec3(0.,2.,4.)+local.x*.009+local.y*.006);
 result+=edge*mix(vec3(.65),spectrum,.55)*mix(.25,1.,frontness);
 return mix(color,result,mask*visibility);
}
void main() {
 vec2 screen=(uv-.5)*vec2(1100.,850.);
 vec3 eye=vec3(0.,0.,cameraDistance), ray=normalize(vec3(screen,-cameraDistance));
 float imageDistance=-eye.z/ray.z;
 vec2 imagePoint=(eye+imageDistance*ray).xy;
 vec3 color=sceneAt(imagePoint,0.);
 // Figma resting lens shadow: x 0, y 4, blur 113.4, black.
 float shadowDistance=roundedBox(imagePoint-vec2(0.,lensCenterY-4.),lensDimensions*.5,44.);
 float shadow=.5*exp(-.5*pow(max(shadowDistance,0.)/56.7,2.));
 color*=1.-shadow*(1.-progress);

 vec4 a=hitPlane(eye,ray,0.), b=hitPlane(eye,ray,1.), c=hitPlane(eye,ray,2.), d=hitPlane(eye,ray,3.);
 orderHits(a,b);orderHits(c,d);orderHits(a,c);orderHits(b,d);orderHits(b,c);
 color=compositePlane(color,a,eye,ray,imageDistance,imagePoint);
 color=compositePlane(color,b,eye,ray,imageDistance,imagePoint);
 color=compositePlane(color,c,eye,ray,imageDistance,imagePoint);
 color=compositePlane(color,d,eye,ray,imageDistance,imagePoint);
 gl_FragColor=vec4(color,1.);
}
`;

/* Paper Shaders 0.0.78 | Apache-2.0 | https://github.com/paper-design/shaders */
(()=>{var ne=Object.defineProperty;var le=(t,e,i)=>e in t?ne(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var s=(t,e,i)=>le(t,typeof e!="symbol"?e+"":e,i);var K=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`;var Q=1920*1080*4,M=class{constructor(e,i,o,l,a=0,c=0,r=2,m=Q,u=[]){s(this,"parentElement");s(this,"canvasElement");s(this,"gl");s(this,"program",null);s(this,"uniformLocations",{});s(this,"fragmentShader");s(this,"rafId",null);s(this,"lastRenderTime",0);s(this,"currentFrame",0);s(this,"speed",0);s(this,"currentSpeed",0);s(this,"providedUniforms");s(this,"mipmaps",[]);s(this,"hasBeenDisposed",!1);s(this,"resolutionChanged",!0);s(this,"textures",new Map);s(this,"minPixelRatio");s(this,"maxPixelCount");s(this,"isSafari",de());s(this,"uniformCache",{});s(this,"textureUnitMap",new Map);s(this,"ownerDocument");s(this,"initProgram",()=>{let e=ce(this.gl,K,this.fragmentShader);e&&(this.program=e)});s(this,"setupPositionAttribute",()=>{let e=this.gl.getAttribLocation(this.program,"a_position"),i=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,i);let o=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1];this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(o),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(e),this.gl.vertexAttribPointer(e,2,this.gl.FLOAT,!1,0,0)});s(this,"setupUniforms",()=>{let e={u_time:this.gl.getUniformLocation(this.program,"u_time"),u_pixelRatio:this.gl.getUniformLocation(this.program,"u_pixelRatio"),u_resolution:this.gl.getUniformLocation(this.program,"u_resolution")};Object.entries(this.providedUniforms).forEach(([i,o])=>{if(e[i]=this.gl.getUniformLocation(this.program,i),o instanceof HTMLImageElement){let l=`${i}AspectRatio`;e[l]=this.gl.getUniformLocation(this.program,l)}}),this.uniformLocations=e});s(this,"renderScale",1);s(this,"parentWidth",0);s(this,"parentHeight",0);s(this,"parentDevicePixelWidth",0);s(this,"parentDevicePixelHeight",0);s(this,"devicePixelsSupported",!1);s(this,"intersectionObserver",null);s(this,"isInViewport",!0);s(this,"resizeObserver",null);s(this,"setupResizeObserver",()=>{this.resizeObserver=new ResizeObserver(([e])=>{if(e?.borderBoxSize[0]){let i=e.devicePixelContentBoxSize?.[0];i!==void 0&&(this.devicePixelsSupported=!0,this.parentDevicePixelWidth=i.inlineSize,this.parentDevicePixelHeight=i.blockSize),this.parentWidth=e.borderBoxSize[0].inlineSize,this.parentHeight=e.borderBoxSize[0].blockSize}this.handleResize()}),this.resizeObserver.observe(this.parentElement)});s(this,"setupIntersectionObserver",()=>{let e=this.ownerDocument.defaultView;e?.IntersectionObserver&&(this.intersectionObserver=new e.IntersectionObserver(([i])=>{this.isInViewport=i?.isIntersecting??!0,this.updateCurrentSpeed()}),this.intersectionObserver.observe(this.parentElement))});s(this,"handleVisualViewportChange",()=>{this.resizeObserver?.disconnect(),this.setupResizeObserver()});s(this,"handleResize",()=>{let e=0,i=0,o=Math.max(1,window.devicePixelRatio),l=visualViewport?.scale??1;if(this.devicePixelsSupported){let f=Math.max(1,this.minPixelRatio/o);e=this.parentDevicePixelWidth*f*l,i=this.parentDevicePixelHeight*f*l}else{let f=Math.max(o,this.minPixelRatio)*l;if(this.isSafari){let p=he(this.ownerDocument);f*=Math.max(1,p)}e=Math.round(this.parentWidth)*f,i=Math.round(this.parentHeight)*f}let a=Math.sqrt(this.maxPixelCount)/Math.sqrt(e*i),c=Math.min(1,a),r=Math.round(e*c),m=Math.round(i*c),u=r/Math.round(this.parentWidth);(this.canvasElement.width!==r||this.canvasElement.height!==m||this.renderScale!==u)&&(this.renderScale=u,this.canvasElement.width=r,this.canvasElement.height=m,this.resolutionChanged=!0,this.gl.viewport(0,0,this.gl.canvas.width,this.gl.canvas.height),this.render(performance.now()))});s(this,"render",e=>{if(this.hasBeenDisposed)return;if(this.program===null){console.warn("Tried to render before program or gl was initialized");return}let i=e-this.lastRenderTime;this.lastRenderTime=e,this.currentSpeed!==0&&(this.currentFrame+=i*this.currentSpeed),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.gl.useProgram(this.program),this.gl.uniform1f(this.uniformLocations.u_time,this.currentFrame*.001),this.resolutionChanged&&(this.gl.uniform2f(this.uniformLocations.u_resolution,this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform1f(this.uniformLocations.u_pixelRatio,this.renderScale),this.resolutionChanged=!1),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.currentSpeed!==0?this.requestRender():this.rafId=null});s(this,"requestRender",()=>{this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=requestAnimationFrame(this.render)});s(this,"setTextureUniform",(e,i)=>{if(!i.complete||i.naturalWidth===0)throw new Error(`Paper Shaders: image for uniform ${e} must be fully loaded`);let o=this.textures.get(e);o&&this.gl.deleteTexture(o),this.textureUnitMap.has(e)||this.textureUnitMap.set(e,this.textureUnitMap.size);let l=this.textureUnitMap.get(e);this.gl.activeTexture(this.gl.TEXTURE0+l);let a=this.gl.createTexture();this.gl.bindTexture(this.gl.TEXTURE_2D,a),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,i),this.mipmaps.includes(e)&&(this.gl.generateMipmap(this.gl.TEXTURE_2D),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR_MIPMAP_LINEAR));let c=this.gl.getError();if(c!==this.gl.NO_ERROR||a===null){console.error("Paper Shaders: WebGL error when uploading texture:",c);return}this.textures.set(e,a);let r=this.uniformLocations[e];if(r){this.gl.uniform1i(r,l);let m=`${e}AspectRatio`,u=this.uniformLocations[m];if(u){let f=i.naturalWidth/i.naturalHeight;this.gl.uniform1f(u,f)}}});s(this,"areUniformValuesEqual",(e,i)=>e===i?!0:Array.isArray(e)&&Array.isArray(i)&&e.length===i.length?e.every((o,l)=>this.areUniformValuesEqual(o,i[l])):!1);s(this,"setUniformValues",e=>{this.gl.useProgram(this.program),Object.entries(e).forEach(([i,o])=>{let l=o;if(o instanceof HTMLImageElement&&(l=`${o.src.slice(0,200)}|${o.naturalWidth}x${o.naturalHeight}`),this.areUniformValuesEqual(this.uniformCache[i],l))return;this.uniformCache[i]=l;let a=this.uniformLocations[i];if(!a){console.warn(`Uniform location for ${i} not found`);return}if(o instanceof HTMLImageElement)this.setTextureUniform(i,o);else if(Array.isArray(o)){let c=null,r=null;if(o[0]!==void 0&&Array.isArray(o[0])){let m=o[0].length;if(o.every(u=>u.length===m))c=o.flat(),r=m;else{console.warn(`All child arrays must be the same length for ${i}`);return}}else c=o,r=c.length;switch(r){case 2:this.gl.uniform2fv(a,c);break;case 3:this.gl.uniform3fv(a,c);break;case 4:this.gl.uniform4fv(a,c);break;case 9:this.gl.uniformMatrix3fv(a,!1,c);break;case 16:this.gl.uniformMatrix4fv(a,!1,c);break;default:console.warn(`Unsupported uniform array length: ${r}`)}}else typeof o=="number"?this.gl.uniform1f(a,o):typeof o=="boolean"?this.gl.uniform1i(a,o?1:0):console.warn(`Unsupported uniform type for ${i}: ${typeof o}`)})});s(this,"getCurrentFrame",()=>this.currentFrame);s(this,"setFrame",e=>{this.currentFrame=e,this.lastRenderTime=performance.now(),this.render(performance.now())});s(this,"setSpeed",(e=1)=>{this.speed=e,this.updateCurrentSpeed()});s(this,"updateCurrentSpeed",()=>{this.setCurrentSpeed(this.ownerDocument.hidden||!this.isInViewport?0:this.speed)});s(this,"setCurrentSpeed",e=>{this.currentSpeed=e,this.rafId===null&&e!==0&&(this.lastRenderTime=performance.now(),this.rafId=requestAnimationFrame(this.render)),this.rafId!==null&&e===0&&(cancelAnimationFrame(this.rafId),this.rafId=null)});s(this,"setMaxPixelCount",(e=Q)=>{this.maxPixelCount=e,this.handleResize()});s(this,"setMinPixelRatio",(e=2)=>{this.minPixelRatio=e,this.handleResize()});s(this,"setUniforms",e=>{this.setUniformValues(e),this.providedUniforms={...this.providedUniforms,...e},this.render(performance.now())});s(this,"handleDocumentVisibilityChange",()=>{this.updateCurrentSpeed()});s(this,"dispose",()=>{this.hasBeenDisposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.gl&&this.program&&(this.textures.forEach(e=>{this.gl.deleteTexture(e)}),this.textures.clear(),this.gl.deleteProgram(this.program),this.program=null,this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,null),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.getError()),this.resizeObserver&&(this.resizeObserver.disconnect(),this.resizeObserver=null),this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=null),visualViewport?.removeEventListener("resize",this.handleVisualViewportChange),this.ownerDocument.removeEventListener("visibilitychange",this.handleDocumentVisibilityChange),this.uniformLocations={},this.canvasElement.remove(),delete this.parentElement.paperShaderMount});if(e?.nodeType===1)this.parentElement=e;else throw new Error("Paper Shaders: parent element must be an HTMLElement");if(this.ownerDocument=e.ownerDocument,!this.ownerDocument.querySelector("style[data-paper-shader]")){let h=this.ownerDocument.createElement("style");h.innerHTML=ue,h.setAttribute("data-paper-shader",""),this.ownerDocument.head.prepend(h)}let f=this.ownerDocument.createElement("canvas");this.canvasElement=f,this.parentElement.prepend(f),this.fragmentShader=i,this.providedUniforms=o,this.mipmaps=u,this.currentFrame=c,this.minPixelRatio=r,this.maxPixelCount=m;let p=f.getContext("webgl2",l);if(!p)throw new Error("Paper Shaders: WebGL is not supported in this browser");this.gl=p,this.initProgram(),this.setupPositionAttribute(),this.setupUniforms(),this.setUniformValues(this.providedUniforms),this.setupResizeObserver(),visualViewport?.addEventListener("resize",this.handleVisualViewportChange),this.setupIntersectionObserver(),this.setSpeed(a),this.parentElement.setAttribute("data-paper-shader",""),this.parentElement.paperShaderMount=this,this.ownerDocument.addEventListener("visibilitychange",this.handleDocumentVisibilityChange)}};function J(t,e,i){let o=t.createShader(e);return o?(t.shaderSource(o,i),t.compileShader(o),t.getShaderParameter(o,t.COMPILE_STATUS)?o:(console.error("An error occurred compiling the shaders: "+t.getShaderInfoLog(o)),t.deleteShader(o),null)):null}function ce(t,e,i){let o=t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT),l=o?o.precision:null;l&&l<23&&(e=e.replace(/precision\s+(lowp|mediump)\s+float;/g,"precision highp float;"),i=i.replace(/precision\s+(lowp|mediump)\s+float/g,"precision highp float").replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g,"$1 highp $3"));let a=J(t,t.VERTEX_SHADER,e),c=J(t,t.FRAGMENT_SHADER,i);if(!a||!c)return null;let r=t.createProgram();return r?(t.attachShader(r,a),t.attachShader(r,c),t.linkProgram(r),t.getProgramParameter(r,t.LINK_STATUS)?(t.detachShader(r,a),t.detachShader(r,c),t.deleteShader(a),t.deleteShader(c),r):(console.error("Unable to initialize the shader program: "+t.getProgramInfoLog(r)),t.deleteProgram(r),t.deleteShader(a),t.deleteShader(c),null)):null}var ue=`@layer paper-shaders {
  :where([data-paper-shader]) {
    isolation: isolate;
    position: relative;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      inset: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      corner-shape: inherit;
    }
  }
}`;function de(){let t=navigator.userAgent.toLowerCase();return t.includes("safari")&&!t.includes("chrome")&&!t.includes("android")}function he(t){let e=visualViewport?.scale??1,i=visualViewport?.width??window.innerWidth,o=window.innerWidth-t.documentElement.clientWidth,l=e*i+o,a=outerWidth/l,c=Math.round(100*a);return c%5===0?c/100:c===33?1/3:c===67?2/3:c===133?4/3:a}var X={none:0,contain:1,cover:2};var ee=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,te=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`;var ie=`
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`,oe=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;var N=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec4 u_colorBack;
uniform vec4 u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

uniform float u_shape;
uniform bool u_isImage;

in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
in vec2 v_imageUV;

out vec4 fragColor;

${ee}
${te}
${oe}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {

  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  if (u_isImage == true) {
    bump = smoothstep(.2, .8, bump);
  }
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;

  return sum / norm;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  if (u_isImage == false) {
    uv = v_objectUV + .5;
    uv.y = 1. - uv.y;
  }

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
  rotatedUV.x * cosA - rotatedUV.y * sinA,
  rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_isImage == true) {
    float edgeRaw = img.r;
    edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);
    edge = pow(edge, 1.6);
    edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
  } else {
    if (u_shape < 1.) {
      // full-fill on canvas
      vec2 borderUV = v_responsiveUV + .5;
      float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
      vec2 mask = min(borderUV, 1. - borderUV);
      vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);

      uv = v_responsiveUV;
      if (ratio > 1.) {
        uv.y /= ratio;
      } else {
        uv.x *= ratio;
      }
      uv += .5;
      uv.y = 1. - uv.y;

      cycleWidth *= 2.;
      contOffset = 1.5;

    } else if (u_shape < 2.) {
      // circle
      vec2 shapeUV = uv - .5;
      shapeUV *= .67;
      edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
    } else if (u_shape < 3.) {
      // daisy
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.68;

      float r = length(shapeUV) * 2.;
      float a = atan(shapeUV.y, shapeUV.x) + .2;
      r *= (1. + .05 * sin(3. * a + 2. * t));
      float f = abs(cos(a * 3.));
      edge = smoothstep(f, f + .7, r);
      edge *= edge;

      uv *= .8;
      cycleWidth *= 1.6;

    } else if (u_shape < 4.) {
      // diamond
      vec2 shapeUV = uv - .5;
      shapeUV = rotate(shapeUV, .25 * PI);
      shapeUV *= 1.42;
      shapeUV += .5;
      vec2 mask = min(shapeUV, 1. - shapeUV);
      vec2 pixel_thickness = vec2(.15);
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);
    } else if (u_shape < 5.) {
      // metaballs
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.3;
      edge = 0.;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 1.5 + 2./3. * sin(fi * 12.345);
        float angle = -fi * 1.5;
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(cos(angle + 1.57), sin(angle + 1.));
        vec2 traj = .4 * (dir1 * sin(t * speed + fi * 1.23) + dir2 * cos(t * (speed * 0.7) + fi * 2.17));
        float d = length(shapeUV + traj);
        edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
      }
      edge = 1. - smoothstep(.65, .9, edge);
      edge = pow(edge, 4.);
    }

    edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  }

  float opacity = 0.;
  if (u_isImage == true) {
    opacity = img.g;
    float frame = getImgFrame(v_imageUV, 0.);
    opacity *= frame;
  } else {
    opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
    if (u_shape < 2.) {
      edge = 1.2 * edge;
    } else if (u_shape < 5.) {
      edge = 1.8 * pow(edge, 1.5);
    }
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color = vec3(0.);
  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);


  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  float contour = 0.;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;


  float colorDispersion = (1. - bump);
  colorDispersion = clamp(colorDispersion, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = 0.;
  float rExtraBlur = 0.;
  float gExtraBlur = 0.;
  if (u_isImage == true) {
    float softness = 0.05 * u_softness;
    blur = softness + .5 * smoothstep(1., 10., u_repetition) * smoothstep(.0, 1., edge);
    float smallCanvasT = 1.0 - smoothstep(100., 500., min(u_resolution.x, u_resolution.y));
    blur += smallCanvasT * smoothstep(.0, 1., edge);
    rExtraBlur = softness * (0.05 + .1 * (u_shiftRed / 20.) * bump);
    gExtraBlur = softness * 0.05 / max(0.001, abs(1. - diagBLtoTR));
  } else {
    blur = u_softness / 15. + .3 * contour;
  }

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  ${ie}

  fragColor = vec4(color, opacity);
}
`,z={measurePerformance:!1,workingSize:512,iterations:40};function j(t){let e=document.createElement("canvas"),i=e.getContext("2d"),o=typeof t=="string"&&t.startsWith("blob:");return new Promise((l,a)=>{if(!t||!i){a(new Error("Invalid file or canvas context"));return}let c=o&&fetch(t).then(u=>u.headers.get("Content-Type")),r=new Image;r.crossOrigin="anonymous";let m=performance.now();r.onload=async()=>{let u,f=await c;f?u=f==="image/svg+xml":typeof t=="string"?u=t.endsWith(".svg")||t.startsWith("data:image/svg+xml"):u=t.type==="image/svg+xml";let p=r.width||r.naturalWidth,h=r.height||r.naturalHeight;if(u){let g=p/h;p>h?(p=4096,h=4096/g):(h=4096,p=4096*g),r.width=p,r.height=h}let E=Math.min(p,h),x=z.workingSize/E,n=Math.round(p*x),v=Math.round(h*x);z.measurePerformance&&(console.log("[Processing Mode]"),console.log(`  Original: ${p}\xD7${h}`),console.log(`  Working: ${n}\xD7${v} (${(x*100).toFixed(1)}% scale)`),x<1&&console.log(`  Speedup: ~${Math.round(1/(x*x))}\xD7`)),e.width=p,e.height=h;let R=document.createElement("canvas");R.width=n,R.height=v;let V=R.getContext("2d");V.drawImage(r,0,0,n,v);let T=performance.now(),w=V.getImageData(0,0,n,v).data,b=new Uint8Array(n*v),O=new Uint8Array(n*v),L=0;for(let d=0,g=0;d<w.length;d+=4,g++){let S=w[d+3]===0?0:1;b[g]=S,L+=S}let G=[],P=[];for(let d=0;d<v;d++)for(let g=0;g<n;g++){let _=d*n+g;if(!b[_])continue;let S=!1;g===0||g===n-1||d===0||d===v-1?S=!0:S=!b[_-1]||!b[_+1]||!b[_-n]||!b[_+n]||!b[_-n-1]||!b[_-n+1]||!b[_+n-1]||!b[_+n+1],S?(O[_]=1,G.push(_)):P.push(_)}z.measurePerformance&&(console.log(`[Mask Building] Time: ${(performance.now()-T).toFixed(2)}ms`),console.log(`  Shape pixels: ${L} / ${n*v} (${(L/(n*v)*100).toFixed(1)}%)`),console.log(`  Interior pixels: ${P.length}`),console.log(`  Boundary pixels: ${G.length}`));let re=me(b,O,new Uint32Array(P),new Uint32Array(G),n,v),se=performance.now(),W=pe(re,b,O,n,v);z.measurePerformance&&console.log(`[Poisson Solve] Time: ${(performance.now()-se).toFixed(2)}ms`);let k=0,Y;for(let d=0;d<P.length;d++){let g=P[d];W[g]>k&&(k=W[g])}let A=document.createElement("canvas");A.width=n,A.height=v;let q=A.getContext("2d"),B=q.createImageData(n,v);for(let d=0;d<v;d++)for(let g=0;g<n;g++){let _=d*n+g,S=_*4;if(!b[_])B.data[S]=255,B.data[S+1]=255,B.data[S+2]=255,B.data[S+3]=0;else{let H=255*(1-W[_]/k);B.data[S]=H,B.data[S+1]=H,B.data[S+2]=H,B.data[S+3]=255}}q.putImageData(B,0,0),i.imageSmoothingEnabled=!0,i.imageSmoothingQuality="high",i.drawImage(A,0,0,n,v,0,0,p,h);let y=i.getImageData(0,0,p,h),$=document.createElement("canvas");$.width=p,$.height=h;let Z=$.getContext("2d");Z.drawImage(r,0,0,p,h);let ae=Z.getImageData(0,0,p,h);for(let d=0;d<y.data.length;d+=4){let g=ae.data[d+3],_=y.data[d+3];g===0?(y.data[d]=255,y.data[d+1]=0):(y.data[d]=_===0?0:y.data[d],y.data[d+1]=g),y.data[d+2]=255,y.data[d+3]=255}i.putImageData(y,0,0),Y=y,e.toBlob(d=>{if(!d){a(new Error("Failed to create PNG blob"));return}if(z.measurePerformance){let g=performance.now()-m;if(console.log(`[Total Processing Time] ${g.toFixed(2)}ms`),x<1){let _=g*Math.pow(p*h/(n*v),1.5);console.log(`[Estimated time at full resolution] ~${_.toFixed(0)}ms`),console.log(`[Time saved] ~${(_-g).toFixed(0)}ms (${Math.round(_/g)}\xD7 faster)`)}}l({imageData:Y,pngBlob:d})},"image/png")},r.onerror=()=>a(new Error("Failed to load image")),r.src=typeof t=="string"?t:URL.createObjectURL(t)})}function me(t,e,i,o,l,a){let c=i.length,r=new Int32Array(c*4);for(let m=0;m<c;m++){let u=i[m],f=u%l,p=Math.floor(u/l);r[m*4+0]=f<l-1&&t[u+1]?u+1:-1,r[m*4+1]=f>0&&t[u-1]?u-1:-1,r[m*4+2]=p>0&&t[u-l]?u-l:-1,r[m*4+3]=p<a-1&&t[u+l]?u+l:-1}return{interiorPixels:i,boundaryPixels:o,pixelCount:c,neighborIndices:r}}function pe(t,e,i,o,l){let a=z.iterations,c=.01,r=new Float32Array(o*l),{interiorPixels:m,neighborIndices:u,pixelCount:f}=t,p=performance.now(),h=1.9,E=[],U=[];for(let x=0;x<f;x++){let n=m[x],v=n%o,R=Math.floor(n/o);(v+R)%2===0?E.push(x):U.push(x)}for(let x=0;x<a;x++){for(let n of E){let v=m[n],R=u[n*4+0],V=u[n*4+1],T=u[n*4+2],I=u[n*4+3],w=0;R>=0&&(w+=r[R]),V>=0&&(w+=r[V]),T>=0&&(w+=r[T]),I>=0&&(w+=r[I]);let b=(c+w)/4;r[v]=h*b+(1-h)*r[v]}for(let n of U){let v=m[n],R=u[n*4+0],V=u[n*4+1],T=u[n*4+2],I=u[n*4+3],w=0;R>=0&&(w+=r[R]),V>=0&&(w+=r[V]),T>=0&&(w+=r[T]),I>=0&&(w+=r[I]);let b=(c+w)/4;r[v]=h*b+(1-h)*r[v]}}if(z.measurePerformance){let x=performance.now()-p;console.log(`[Optimized Poisson Solver (SOR \u03C9=${h})]`),console.log(`  Working size: ${o}\xD7${l}`),console.log(`  Iterations: ${a}`),console.log(`  Time: ${x.toFixed(2)}ms`),console.log(`  Interior pixels processed: ${f}`),console.log(`  Speed: ${(a*f/(x*1e3)).toFixed(2)} Mpixels/sec`)}return r}function C(t){if(Array.isArray(t))return t.length===4?t:t.length===3?[...t,1]:F;if(typeof t!="string")return F;let e,i,o,l=1;if(t.startsWith("#"))[e,i,o,l]=fe(t);else if(t.startsWith("rgb")){let a=ge(t);if(a===null)return F;[e,i,o,l]=a}else if(t.startsWith("hsl")){let a=ve(t);if(a===null)return F;[e,i,o,l]=xe(a)}else return console.error("Unsupported color format",t),F;return[D(e,0,1),D(i,0,1),D(o,0,1),D(l,0,1)]}function fe(t){if(t=t.replace(/^#/,""),(t.length===3||t.length===4)&&(t=t.split("").map(a=>a+a).join("")),t.length===6&&(t=t+"ff"),!/^[0-9a-f]{8}$/i.test(t))return console.warn("Invalid hex color"),F;let e=parseInt(t.slice(0,2),16)/255,i=parseInt(t.slice(2,4),16)/255,o=parseInt(t.slice(4,6),16)/255,l=parseInt(t.slice(6,8),16)/255;return[e,i,o,l]}function ge(t){let e=t.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i);return e?[parseInt(e[1]??"0")/255,parseInt(e[2]??"0")/255,parseInt(e[3]??"0")/255,e[4]===void 0?1:parseFloat(e[4])]:null}function ve(t){let e=t.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i);return e?[parseInt(e[1]??"0"),parseInt(e[2]??"0"),parseInt(e[3]??"0"),e[4]===void 0?1:parseFloat(e[4])]:null}function xe(t){let[e,i,o,l]=t,a=e/360,c=i/100,r=o/100,m,u,f;if(i===0)m=u=f=r;else{let p=(U,x,n)=>(n<0&&(n+=1),n>1&&(n-=1),n<.16666666666666666?U+(x-U)*6*n:n<.5?x:n<.6666666666666666?U+(x-U)*(.6666666666666666-n)*6:U),h=r<.5?r*(1+c):r+c-r*c,E=2*r-h;m=p(E,h,a+1/3),u=p(E,h,a),f=p(E,h,a-1/3)}return[m,u,f,l]}var D=(t,e,i)=>Math.min(Math.max(t,e),i),F=[.5,.5,.5,1];function _e(t){return new Promise((e,i)=>{let o=new Image;o.onload=()=>e(o),o.onerror=()=>i(new Error("Paper Liquid Metal: processed mask failed to load")),o.src=t})}async function be(t,e,i={}){let o=await j(e),l=URL.createObjectURL(o.pngBlob);try{let a=await _e(l),c={u_colorBack:C(i.colorBack??"#000000"),u_colorTint:C(i.colorTint??"#ffffff"),u_image:a,u_contour:i.contour??.4,u_distortion:i.distortion??.07,u_softness:i.softness??.1,u_repetition:i.repetition??2,u_shiftRed:i.shiftRed??.3,u_shiftBlue:i.shiftBlue??.3,u_angle:i.angle??70,u_isImage:!0,u_shape:0,u_fit:X.contain,u_scale:i.scale??1,u_rotation:0,u_offsetX:0,u_offsetY:0,u_originX:.5,u_originY:.5,u_worldWidth:0,u_worldHeight:0},r=new M(t,N,c,{alpha:!0,preserveDrawingBuffer:!1},i.speed??.28,i.frame??0,i.minPixelRatio??1.5,i.maxPixelCount??9e5,["u_image"]);return{canvas:r.canvasElement,setSpeed:m=>r.setSpeed(m),dispose:()=>r.dispose()}}finally{URL.revokeObjectURL(l)}}globalThis.PaperLiquidMetal=Object.freeze({version:"0.0.78",mount:be});})();

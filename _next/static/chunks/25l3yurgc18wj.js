(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,57962,e=>{"use strict";var t=e.i(90072),i=e.i(68865);class s{x;omega;v;constructor(e=0,t=7){this.x=e,this.omega=t,this.v=0}step(e,t){let i=this.omega,s=this.x-e,r=Math.exp(-i*t),a=(s+(this.v+i*s)*t)*r;return this.v=(this.v-i*(this.v+i*s)*t)*r,this.x=e+a,this.x}}class r{yaw=new s(0,6.5);pitch=new s(0,6.5);weight=new s(0,3);target=null;enabled=!0;limit=35;update(e,t){let s=0,r=0;if(this.target&&this.enabled){let t=(0,i.lookAtAngles)(e,this.target,this.limit);s=t.head.yaw/.65,r=t.head.pitch/.65}this.yaw.step(s,t),this.pitch.step(r,t),this.weight.step(this.target&&this.enabled?1:0,t)}apply(e){let t=this.weight.x;e.chest.yaw+=.15*this.yaw.x*t,e.chest.pitch+=.08*this.pitch.x*t,e.neck.yaw+=.3*this.yaw.x*t,e.neck.pitch+=.3*this.pitch.x*t,e.head.yaw+=this.yaw.x*t,e.head.pitch+=this.pitch.x*t}}e.s(["HeadLook",0,r,"Spring",0,s,"reachTo",0,function(e,s,r,a,o=1,n){let h=s.find(e=>e.n==="shoulder"+r).c,l=(0,i.armIK)(h,a,n??[.6*("L"===r?-1:1),-1,-.2]),d="L"===r?e.armL:e.armR,c=(e,t)=>t+360*Math.round((e-t)/360);for(let e=0;e<2;e++)l.th[e]=c(d.th[e],l.th[e]),d.th[e]=d.th[e]+(l.th[e]-d.th[e])*o,d.ph[e]=d.ph[e]+(l.ph[e]-d.ph[e])*o;let u=new t.Vector3(...l.wrist).sub(new t.Vector3(...l.elbow)).normalize(),[p,v]=(0,i.dirToAngles)([u.x,u.y,u.z]),f=c(d.th[2],p);return d.th[2]=d.th[2]+(f-d.th[2])*o,d.ph[2]=d.ph[2]+(v-d.ph[2])*o,l}])},27941,e=>{"use strict";var t=e.i(8560);let i=`
#ifdef USE_SHADOWMAP
#if NUM_SPOT_LIGHT_SHADOWS > 0
#if defined( SHADOWMAP_TYPE_BASIC )
  #define PCSS_NEAR 0.50
  #define PCSS_FAR 40.0
  #define PCSS_BLOCKER_SAMPLES 12
  #define PCSS_FILTER_SAMPLES 20
  float pcssLinearDepth( float d ) { return ( PCSS_NEAR * PCSS_FAR ) / ( PCSS_FAR - d * ( PCSS_FAR - PCSS_NEAR ) ); }
  float pcssNoise( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
  vec2 pcssVogel( int i, int n, float phi ) {
    float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
    float theta = float( i ) * 2.399963229728653 + phi;
    return vec2( cos( theta ), sin( theta ) ) * r;
  }
  float getSpotShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;
    bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
    if ( ! inFrustum || shadowCoord.z > 1.0 ) return 1.0;
    float zR = shadowCoord.z;
    if ( shadowRadius <= 0.0 ) return mix( 1.0, step( zR, texture2D( shadowMap, shadowCoord.xy ).r ), shadowIntensity );
    float zRLin = pcssLinearDepth( zR );
    float lightUV = shadowRadius;
    float phi = pcssNoise( gl_FragCoord.xy ) * 6.28318530718;
    float texel = 1.0 / shadowMapSize.x;
    float searchR = clamp( lightUV * ( zRLin - PCSS_NEAR ) / zRLin, 2.0 * texel, 0.06 );
    float blockerSum = 0.0, blockers = 0.0;
    for ( int i = 0; i < PCSS_BLOCKER_SAMPLES; i ++ ) {
      float d = texture2D( shadowMap, shadowCoord.xy + pcssVogel( i, PCSS_BLOCKER_SAMPLES, phi ) * searchR ).r;
      if ( d < zR ) { blockerSum += pcssLinearDepth( d ); blockers += 1.0; }
    }
    if ( blockers < 0.5 ) return 1.0;
    float zB = blockerSum / blockers;
    float penumbra = lightUV * PCSS_NEAR * ( zRLin - zB ) / ( zB * zRLin );
    float filterR = clamp( penumbra, 1.25 * texel, 0.05 );
    float lit = 0.0;
    for ( int i = 0; i < PCSS_FILTER_SAMPLES; i ++ ) {
      vec2 o = pcssVogel( i, PCSS_FILTER_SAMPLES, phi + 1.618 ) * filterR;
      lit += step( zR, texture2D( shadowMap, shadowCoord.xy + o ).r );
    }
    lit /= float( PCSS_FILTER_SAMPLES );
    return mix( 1.0, lit, shadowIntensity );
  }
#else
  #define getSpotShadow getShadow
#endif
#endif
#endif
`,s=!1;e.s(["configurePCSSSpot",0,function(e,t,i=2048){var s;e.castShadow=!0;let r=e.shadow;r.mapSize.set(i,i),r.camera.near=.5,r.camera.far=40,r.focus=1,r.bias=-6e-5,r.normalBias=.004,r.radius=t/(2*(.5*Math.tan((s=e).angle*s.shadow.focus))),r.camera.updateProjectionMatrix()},"installPCSS",0,function(){if(s)return;s=!0;let e=t.ShaderChunk;for(let t of(e.shadowmap_pars_fragment+=i,["lights_fragment_begin","shadowmask_pars_fragment"])){let i=e[t];e[t]=i.replaceAll("getShadow( spotShadowMap[ i ]","getSpotShadow( spotShadowMap[ i ]"),e[t]===i&&console.warn(`PCSS: chunk ${t} nije zakrpan`)}}])},22534,e=>{"use strict";var t=e.i(90072);let i={name:"HorizontalBlurShader",uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float h;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

			gl_FragColor = sum;

		}`},s={name:"VerticalBlurShader",uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float v;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

			gl_FragColor = sum;

		}`};class r{group=new t.Group;rt;rtBlur;plane;camera;depthMaterial;hBlur=new t.ShaderMaterial(i);vBlur=new t.ShaderMaterial(s);blurPlane=new t.Mesh(new t.PlaneGeometry(2,2));blurScene=new t.Scene;blurCam=new t.OrthographicCamera(-1,1,1,-1,0,1);constructor({width:e=3,depth:i=3,far:s=1.2,resolution:r=512,blur:a=2.4,opacity:o=.9,darkness:n=1.7}={}){this.rt=new t.WebGLRenderTarget(r,r,{type:t.HalfFloatType}),this.rtBlur=new t.WebGLRenderTarget(r,r,{type:t.HalfFloatType}),this.rt.texture.generateMipmaps=this.rtBlur.texture.generateMipmaps=!1,this.plane=new t.Mesh(new t.PlaneGeometry(e,i).rotateX(-Math.PI/2),new t.MeshBasicMaterial({map:this.rt.texture,transparent:!0,opacity:o,depthWrite:!1,toneMapped:!1,color:0})),this.plane.material.color.set(0),this.plane.renderOrder=1,this.plane.scale.z=-1,this.plane.position.y=.0015,this.group.add(this.plane),this.camera=new t.OrthographicCamera(-e/2,e/2,i/2,-i/2,0,s),this.camera.rotation.x=Math.PI/2,this.camera.layers.set(3),this.group.add(this.camera),this.depthMaterial=new t.MeshDepthMaterial;const h={value:n};this.depthMaterial.onBeforeCompile=e=>{e.uniforms.darkness=h,e.fragmentShader=`uniform float darkness;
${e.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );","gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );")}`},this.depthMaterial.depthTest=this.depthMaterial.depthWrite=!1,this.hBlur.depthTest=this.vBlur.depthTest=!1,this.blurScene.add(this.blurPlane),this.blurPlane.position.z=-.5,this.blurAmount=a}blurAmount;blur(e,t){let i=this.rt.width;this.blurPlane.material=this.hBlur,this.hBlur.uniforms.tDiffuse.value=this.rt.texture,this.hBlur.uniforms.h.value=t/i,e.setRenderTarget(this.rtBlur),e.render(this.blurScene,this.blurCam),this.blurPlane.material=this.vBlur,this.vBlur.uniforms.tDiffuse.value=this.rtBlur.texture,this.vBlur.uniforms.v.value=t/i,e.setRenderTarget(this.rt),e.render(this.blurScene,this.blurCam)}update(e,i){let s=e.getRenderTarget(),r=i.background,a=i.overrideMaterial,o=e.getClearAlpha(),n=e.getClearColor(new t.Color);i.background=null,i.overrideMaterial=this.depthMaterial,e.setClearColor(0,0),this.plane.visible=!1,e.setRenderTarget(this.rt),e.clear(),e.render(i,this.camera),i.overrideMaterial=a,this.blur(e,this.blurAmount),this.blur(e,.4*this.blurAmount),this.plane.visible=!0,i.background=r,e.setClearColor(n,o),e.setRenderTarget(s)}dispose(){this.rt.dispose(),this.rtBlur.dispose(),this.plane.geometry.dispose(),this.plane.material.dispose(),this.depthMaterial.dispose(),this.hBlur.dispose(),this.vBlur.dispose()}}e.s(["ContactShadows",0,r,"enableContact",0,function(e){e.traverse(e=>e.layers.enable(3))}],22534)},23685,e=>{"use strict";var t=e.i(90072),i=e.i(81395),s=e.i(54181),r=e.i(27941),a=e.i(22534),o=e.i(97045),n=e.i(57962),h=e.i(20547),l=e.i(41343),d=e.i(68865);let c=`
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform vec2 res;
  uniform vec2 center;
  uniform float radius;
  uniform float soft;
  uniform float ring;
  uniform float exposure;
  uniform float seed;
  uniform float navPx;
  varying vec2 vUv;
  // ACES (Narkowicz) + sRGB — isti filmski ton kao ostale scene
  vec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }
  vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
  float h12( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  void main() {
    vec2 px = vUv * res;
    vec2 dv = px - center;
    float d = length( dv );
    // uzak rub točno ispod prstena: svaka točka je drvo ili čelik (bez "mjedenog" pretapanja)
    float m = 1.0 - smoothstep( radius - soft, radius + soft * 0.2, d );
    vec3 a = texture2D( tA, vUv ).rgb;
    vec3 b = texture2D( tB, vUv ).rgb;
    vec3 c = mix( a, b, m );
    c = aces( c * exposure );
    // tanki precizni prsten na rubu maske + 60 oznaka kao na okretnom prstenu sata (kratke crte prema van)
    if ( ring > 0.0 && radius > 2.0 ) {
      float line = 1.0 - smoothstep( 0.35, 1.25, abs( d - radius ) );
      float ang = atan( dv.y, dv.x );
      float t = fract( ang / 6.2831853 * 60.0 );
      float tick = ( 1.0 - smoothstep( 0.04, 0.09, min( t, 1.0 - t ) ) ) * step( radius + 3.0, d ) * ( 1.0 - step( radius + 9.0, d ) );
      float major = step( 0.5, fract( ang / 6.2831853 * 12.0 + 0.5 / 12.0 * 0.0 ) ) * 0.0;
      float underNav = smoothstep( navPx * 0.85, navPx * 1.25, res.y - px.y );
      c = mix( c, vec3( 0.97, 0.96, 0.93 ), ring * underNav * ( line * 0.75 + tick * 0.45 + major ) );
    }
    c = toSRGB( c );
    // blaga vinjeta i jednobojno zrno
    vec2 q = vUv - 0.5;
    c *= 1.0 - dot( q, q ) * 0.42;
    float n = h12( floor( px ) + seed * 91.0 ) - 0.5;
    c += n * 0.018;
    gl_FragColor = vec4( c, 1.0 );
  }
`;class u{scene=new t.Scene;camera=(0,i.lensCamera)(40);wood;robot;pixelScale=1.7;contact=new a.ContactShadows({width:3,depth:3,far:1.2,blur:1.8,opacity:.9,darkness:1.9});key;ringOn=!0;mobileMode="oboje";coarse=!1;mx=new n.Spring(0,12);my=new n.Spring(0,12);mr=new n.Spring(0,7);pointer={x:0,y:0,inside:!1,down:!1,touch:!1,lastTouch:-10};drag="none";dragW=new n.Spring(0,9);dragTarget=[0,0,0];dragSide="L";lastDragMode="none";planeZ=0;yaw=0;yawVel=0;headLook=new n.HeadLook;time=0;engine=null;rtA;rtB;compScene=new t.Scene;compCam=new t.OrthographicCamera(-1,1,1,-1,0,1);comp;v=new t.Vector3;w=new t.Vector3;size=new t.Vector2;constructor(){this.scene.background=new t.Color("#d8d1c5");const e=new t.Mesh(new t.PlaneGeometry(30,30),new t.MeshPhysicalMaterial({color:"#cfc8bb",roughness:.8,clearcoat:.1}));e.rotation.x=-Math.PI/2,e.receiveShadow=!0,this.scene.add(e);const i=new t.Mesh(new t.CylinderGeometry(9,9,12,64,1,!0,.6*Math.PI,.8*Math.PI),new t.MeshStandardMaterial({color:"#d3ccbf",roughness:.95,side:t.BackSide}));for(const e of(i.position.set(0,6,1.5),this.scene.add(i,this.contact.group),this.scene.fog=new t.Fog("#d8d1c5",9,22),this.wood=new o.Figure({look:"wood"}),this.robot=new o.Figure({look:"robot-hitech"}),[this.wood,this.robot]))this.scene.add(e.group),e.viewCamera=this.camera;(0,a.enableContact)(this.wood.group);const s=this.basePose(0);this.wood.setPose(s),this.robot.setPose(s),this.key=new t.SpotLight("#fff5ea",190,0,t.MathUtils.degToRad(24),.7,2),this.key.position.set(-2.4,5.2,3.6),this.key.target.position.set(0,1,0),(0,r.configurePCSSSpot)(this.key,1,2048);const n=new t.SpotLight("#eef2ff",90,0,t.MathUtils.degToRad(22),.8,2);n.position.set(2.6,3.6,-3.4),n.target.position.set(0,1.2,0);const h=new t.HemisphereLight("#fffaf2","#b9b0a2",.32);this.scene.add(this.key,this.key.target,n,n.target,h),this.camera.position.set(.35,1,4.9),this.camera.lookAt(0,.98,0);const l={samples:4,type:t.HalfFloatType,colorSpace:t.LinearSRGBColorSpace,depthBuffer:!0};this.rtA=new t.WebGLRenderTarget(4,4,l),this.rtB=new t.WebGLRenderTarget(4,4,l),this.comp=new t.ShaderMaterial({uniforms:{tA:{value:this.rtA.texture},tB:{value:this.rtB.texture},res:{value:new t.Vector2(1,1)},center:{value:new t.Vector2(0,0)},radius:{value:0},soft:{value:24},ring:{value:1},exposure:{value:1},seed:{value:0},navPx:{value:0}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }",fragmentShader:c,depthTest:!1,depthWrite:!1});const d=new t.BufferGeometry;d.setAttribute("position",new t.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3)),d.setAttribute("uv",new t.Float32BufferAttribute([0,0,2,0,0,2],2));const u=new t.Mesh(d,this.comp);u.frustumCulled=!1,this.compScene.add(u)}basePose(e){let t=.5-.5*Math.cos(e/10*Math.PI*2),i=(0,d.blendPose)((0,l.getPose)("b_bas_s"),(0,l.getPose)("b_seconde_s"),.9*(0,h.smootherstep)(t)),s=(0,l.getPose)("mir");return i.legL=s.legL,i.legR=s.legR,i.pelvis=s.pelvis,i.support=s.support,i.touch=s.touch,(0,h.applySecondary)(i,e,{breath:1,sway:.45}),i}showAllForCompile(){let e=[this.wood.group.visible,this.robot.group.visible];return this.wood.group.visible=this.robot.group.visible=!0,()=>{this.wood.group.visible=e[0],this.robot.group.visible=e[1]}}compileJobs(){return[{scene:this.scene,camera:this.camera,target:this.rtA},{scene:this.compScene,camera:this.compCam,target:null}]}prepareEnvironment(e){this.scene.environment??=(0,s.buildEnvironment)(e,{top:"#f2ede4",horizon:"#dcd5c9",bottom:"#8f877b",boxes:[{dir:[-.6,.7,.6],size:[10,8],intensity:3.4,color:"#fffaf2",softness:.7},{dir:[.7,.4,-.6],size:[6,10],intensity:2.4,color:"#f4f6ff",softness:.8},{dir:[.2,.1,1],size:[14,6],intensity:1.2,color:"#ffffff",softness:.9}]})}activate(e){this.engine=e,this.prepareEnvironment(e.renderer),this.scene.environmentIntensity=.8}setTier(e){let t="high"===e?2048:1024;this.key.shadow.mapSize.set(t,t),this.rtA.samples=this.rtB.samples="high"===e?4:2*("medium"===e)}resize(e,t){let i=e/Math.max(1,t)<.8;this.camera.position.set(i?.25:.35,i?1.1:1,i?8.3:4.9),this.camera.lookAt(0,i?.95:.98,0),this.engine&&(this.engine.renderer.getDrawingBufferSize(this.size),this.rtA.setSize(this.size.x,this.size.y),this.rtB.setSize(this.size.x,this.size.y),this.comp.uniforms.res.value.copy(this.size))}screenOf(e,i){let s=e.map[i];if(!s)return null;let r="c"in s?new t.Vector3(...s.c):new t.Vector3(...s.S).addScaledVector(new t.Vector3(...s.M.y),.5*s.L),a=e.toWorld(r),o=a.clone().project(this.camera);return{x:(.5*o.x+.5)*window.innerWidth,y:(-(.5*o.y)+.5)*window.innerHeight,world:a}}maskCenter(){let e=this.size.x/Math.max(1,window.innerWidth);return[this.mx.x/e,window.innerHeight-this.my.x/e,this.mr.x/e]}partScreen(e){let t=this.screenOf(this.wood,e);return t?{x:t.x,y:t.y}:null}pointerMove(e,t,i,s){let r=this.pointer,a=e-r.x;r.x=e,r.y=t,r.inside=i,r.touch=s,s&&(r.lastTouch=this.time),"rotate"===this.drag&&(this.yawVel+=.012*a),("handL"===this.drag||"handR"===this.drag||"head"===this.drag)&&(this.dragTarget=this.planePoint(e,t)),this.engine?.invalidate()}pointerDown(e,t,i){this.pointerMove(e,t,!0,i),this.pointer.down=!0;let s="rotate",r=i?70:52;for(let[i,a]of[["handL","handL"],["handR","handR"],["head","head"]]){let o=this.screenOf(this.wood,a);if(!o)continue;let n=Math.hypot(o.x-e,o.y-t);n<r&&(r=n,s=i,this.planeZ=o.world.z)}this.drag=s,this.lastDragMode=s,("handL"===s||"handR"===s)&&(this.dragSide="handL"===s?"L":"R"),"rotate"!==s&&(this.dragTarget=this.planePoint(e,t))}pointerUp(){this.pointer.down=!1,this.drag="none"}planePoint(e,t){let i=e/window.innerWidth*2-1,s=-(2*(t/window.innerHeight))+1;this.v.set(i,s,.5).unproject(this.camera),this.w.copy(this.v).sub(this.camera.position).normalize();let r=(this.planeZ-this.camera.position.z)/this.w.z,a=this.camera.position.clone().addScaledVector(this.w,r);this.wood.body.updateWorldMatrix(!0,!1);let o=this.wood.body.worldToLocal(a);return[o.x,o.y,o.z]}update(e){this.time+=e;let i=this.pointer;for(let i of("rotate"!==this.drag&&(this.yawVel*=Math.exp(-2.6*e),this.yawVel+=-(.9*this.yaw)*e),this.yaw+=this.yawVel*e,this.yaw=t.MathUtils.clamp(this.yaw,-2.6,2.6),[this.wood,this.robot]))i.group.rotation.y=this.yaw;let s=this.basePose(this.time),r="none"!==this.drag&&"rotate"!==this.drag;this.dragW.step(+!!r,e),this.dragW.x>.001&&this.wood.parts.length&&("handL"===this.lastDragMode||"handR"===this.lastDragMode)&&(0,n.reachTo)(s,this.wood.parts,this.dragSide,this.dragTarget,this.dragW.x),this.headLook.target="head"===this.lastDragMode&&this.dragW.x>.01?[this.dragTarget[0],this.dragTarget[1],this.dragTarget[2]+2]:null,this.wood.parts.length&&this.headLook.update(this.wood.parts,e),this.headLook.apply(s),this.wood.setPose(s),this.robot.setPose(s);let a=i.x,o=i.y,h=i.inside,l=this.coarse&&this.time-i.lastTouch>1.2;if(this.coarse&&("samo"===this.mobileMode||"oboje"===this.mobileMode&&l)){let e=this.screenOf(this.wood,"chest"),t=e?.x??window.innerWidth/2,i=e?.y??window.innerHeight/2;a=t+Math.sin(.37*this.time)*window.innerWidth*.22,o=i+Math.sin(.53*this.time+1.1)*window.innerHeight*.2,h=!0}this.coarse&&"prst"===this.mobileMode&&l&&(h=!1);let d=this.size.x/Math.max(1,window.innerWidth);this.mx.step(a*d,e),this.my.step((window.innerHeight-o)*d,e);let c=Math.min(window.innerHeight,window.innerWidth)*(this.coarse?.26:.2)*d;this.mr.step(h?c:0,e);let u=this.comp.uniforms;return u.center.value.set(this.mx.x,this.my.x),u.radius.value=Math.max(0,this.mr.x),u.soft.value=4.5*d,u.ring.value=this.ringOn?Math.min(1,this.mr.x/(.6*c+.001)):0,u.navPx.value=72*d,u.seed.value=(u.seed.value+1.618)%1e3,this.engine&&this.contact.update(this.engine.renderer,this.scene),!0}render(e){let t=e.renderer;this.rtA.width<8&&this.resize(e.width,e.height),this.robot.group.visible=!1,this.wood.group.visible=!0,t.shadowMap.autoUpdate=!1,t.shadowMap.needsUpdate=!0,t.setRenderTarget(this.rtA),t.render(this.scene,this.camera),this.robot.group.visible=!0,this.wood.group.visible=!1,t.setRenderTarget(this.rtB),t.render(this.scene,this.camera),this.wood.group.visible=!0,t.shadowMap.autoUpdate=!0,t.setRenderTarget(null),t.render(this.compScene,this.compCam)}deactivate(){this.pointer.inside=!1}}e.s(["CursorScene",0,u])}]);
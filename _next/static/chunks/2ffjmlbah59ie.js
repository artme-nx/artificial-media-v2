(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,27941,e=>{"use strict";var t=e.i(8560);let i=`
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
`,s=!1;e.s(["configurePCSSSpot",0,function(e,t,i=2048){var s;e.castShadow=!0;let o=e.shadow;o.mapSize.set(i,i),o.camera.near=.5,o.camera.far=40,o.focus=1,o.bias=-6e-5,o.normalBias=.004,o.radius=t/(2*(.5*Math.tan((s=e).angle*s.shadow.focus))),o.camera.updateProjectionMatrix()},"installPCSS",0,function(){if(s)return;s=!0;let e=t.ShaderChunk;for(let t of(e.shadowmap_pars_fragment+=i,["lights_fragment_begin","shadowmask_pars_fragment"])){let i=e[t];e[t]=i.replaceAll("getShadow( spotShadowMap[ i ]","getSpotShadow( spotShadowMap[ i ]"),e[t]===i&&console.warn(`PCSS: chunk ${t} nije zakrpan`)}}])},22534,e=>{"use strict";var t=e.i(90072);let i={name:"HorizontalBlurShader",uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`

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

		}`};class o{group=new t.Group;rt;rtBlur;plane;camera;depthMaterial;hBlur=new t.ShaderMaterial(i);vBlur=new t.ShaderMaterial(s);blurPlane=new t.Mesh(new t.PlaneGeometry(2,2));blurScene=new t.Scene;blurCam=new t.OrthographicCamera(-1,1,1,-1,0,1);constructor({width:e=3,depth:i=3,far:s=1.2,resolution:o=512,blur:a=2.4,opacity:r=.9,darkness:n=1.7}={}){this.rt=new t.WebGLRenderTarget(o,o,{type:t.HalfFloatType}),this.rtBlur=new t.WebGLRenderTarget(o,o,{type:t.HalfFloatType}),this.rt.texture.generateMipmaps=this.rtBlur.texture.generateMipmaps=!1,this.plane=new t.Mesh(new t.PlaneGeometry(e,i).rotateX(-Math.PI/2),new t.MeshBasicMaterial({map:this.rt.texture,transparent:!0,opacity:r,depthWrite:!1,toneMapped:!1,color:0})),this.plane.material.color.set(0),this.plane.renderOrder=1,this.plane.scale.z=-1,this.plane.position.y=.0015,this.group.add(this.plane),this.camera=new t.OrthographicCamera(-e/2,e/2,i/2,-i/2,0,s),this.camera.rotation.x=Math.PI/2,this.camera.layers.set(3),this.group.add(this.camera),this.depthMaterial=new t.MeshDepthMaterial;const l={value:n};this.depthMaterial.onBeforeCompile=e=>{e.uniforms.darkness=l,e.fragmentShader=`uniform float darkness;
${e.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );","gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );")}`},this.depthMaterial.depthTest=this.depthMaterial.depthWrite=!1,this.hBlur.depthTest=this.vBlur.depthTest=!1,this.blurScene.add(this.blurPlane),this.blurPlane.position.z=-.5,this.blurAmount=a}blurAmount;blur(e,t){let i=this.rt.width;this.blurPlane.material=this.hBlur,this.hBlur.uniforms.tDiffuse.value=this.rt.texture,this.hBlur.uniforms.h.value=t/i,e.setRenderTarget(this.rtBlur),e.render(this.blurScene,this.blurCam),this.blurPlane.material=this.vBlur,this.vBlur.uniforms.tDiffuse.value=this.rtBlur.texture,this.vBlur.uniforms.v.value=t/i,e.setRenderTarget(this.rt),e.render(this.blurScene,this.blurCam)}update(e,i){let s=e.getRenderTarget(),o=i.background,a=i.overrideMaterial,r=e.getClearAlpha(),n=e.getClearColor(new t.Color);i.background=null,i.overrideMaterial=this.depthMaterial,e.setClearColor(0,0),this.plane.visible=!1,e.setRenderTarget(this.rt),e.clear(),e.render(i,this.camera),i.overrideMaterial=a,this.blur(e,this.blurAmount),this.blur(e,.4*this.blurAmount),this.plane.visible=!0,i.background=o,e.setClearColor(n,r),e.setRenderTarget(s)}dispose(){this.rt.dispose(),this.rtBlur.dispose(),this.plane.geometry.dispose(),this.plane.material.dispose(),this.depthMaterial.dispose(),this.hBlur.dispose(),this.vBlur.dispose()}}e.s(["ContactShadows",0,o,"enableContact",0,function(e){e.traverse(e=>e.layers.enable(3))}],22534)},50885,e=>{"use strict";var t=e.i(90072);class i{points;uniforms;lights=[];tmp=new t.Vector3;constructor({count:e=1400,box:i,size:s=.006,seed:o=5}){let a=o>>>0;const r=()=>(a=1664525*a+0x3c6ef35f>>>0)/0x100000000,n=new Float32Array(3*e),l=new Float32Array(4*e);for(let t=0;t<e;t++)n[3*t]=i.min.x+r()*(i.max.x-i.min.x),n[3*t+1]=i.min.y+r()*(i.max.y-i.min.y),n[3*t+2]=i.min.z+r()*(i.max.z-i.min.z),l.set([r(),r(),r(),r()],4*t);const h=new t.BufferGeometry;h.setAttribute("position",new t.BufferAttribute(n,3)),h.setAttribute("rnd",new t.BufferAttribute(l,4)),h.boundingSphere=new t.Sphere(new t.Vector3,1e4);const u=()=>[new t.Vector3,new t.Vector3,new t.Vector3];this.uniforms={time:{value:0},lightPos:{value:u()},lightDir:{value:u()},lightColor:{value:[new t.Color(0,0,0),new t.Color(0,0,0),new t.Color(0,0,0)]},cosOuter:{value:[.9,.9,.9]},cosInner:{value:[.95,.95,.95]},pixelScale:{value:500},size:{value:s},gain:{value:1}};const c=new t.ShaderMaterial({uniforms:this.uniforms,vertexShader:`
        attribute vec4 rnd;
        uniform float time;
        uniform vec3 lightPos[3];
        uniform vec3 lightDir[3];
        uniform vec3 lightColor[3];
        uniform float cosOuter[3];
        uniform float cosInner[3];
        uniform float pixelScale;
        uniform float size;
        uniform float gain;
        varying vec3 vColor;
        varying float vSoft;
        void main() {
          vec3 p = position;
          float ph = rnd.x * 6.2831;
          float sp = 0.25 + rnd.y * 0.5;
          p += vec3(
            sin( time * 0.11 * sp + ph ) * 0.16 + sin( time * 0.29 * sp + ph * 2.0 ) * 0.05,
            sin( time * 0.07 * sp + ph * 1.3 ) * 0.12 + sin( time * 0.023 + ph ) * 0.3,
            cos( time * 0.09 * sp + ph * 0.7 ) * 0.14
          );
          vec4 world = modelMatrix * vec4( p, 1.0 );
          float twinkle = 0.6 + 0.4 * sin( time * ( 1.5 + rnd.z * 2.5 ) + ph * 3.0 );
          vec3 lit = vec3( 0.0 );
          for ( int i = 0; i < 3; i ++ ) {
            vec3 L = world.xyz - lightPos[ i ];
            float dist = length( L );
            float cone = smoothstep( cosOuter[ i ], cosInner[ i ], dot( L / dist, lightDir[ i ] ) );
            lit += lightColor[ i ] * cone / max( dist * dist, 1.0 );
          }
          vColor = lit * twinkle * gain;
          vec4 mv = viewMatrix * world;
          gl_Position = projectionMatrix * mv;
          float s = size * ( 0.5 + rnd.y );
          gl_PointSize = clamp( s * pixelScale / -mv.z, 1.0, 18.0 );
          vSoft = clamp( gl_PointSize / 5.0, 0.0, 1.0 );
        }
      `,fragmentShader:`
        varying vec3 vColor;
        varying float vSoft;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = length( c ) * 2.0;
          float a = smoothstep( 1.0, mix( 0.2, 0.0, vSoft ), r );
          gl_FragColor = vec4( vColor * a, 1.0 );
        }
      `,transparent:!0,depthWrite:!1,blending:t.AdditiveBlending});this.points=new t.Points(h,c),this.points.frustumCulled=!1}setLights(e){this.lights=e.slice(0,3)}update(e,i,s){let o=this.uniforms;o.time.value+=e,o.pixelScale.value=s/(2*Math.tan(t.MathUtils.degToRad(i.fov)/2));for(let e=0;e<3;e++){let t=this.lights[e];if(!t){o.lightColor.value[e].setRGB(0,0,0);continue}t.updateMatrixWorld(),o.lightPos.value[e].setFromMatrixPosition(t.matrixWorld),this.tmp.setFromMatrixPosition(t.target.matrixWorld),o.lightDir.value[e].subVectors(this.tmp,o.lightPos.value[e]).normalize(),o.lightColor.value[e].copy(t.color).multiplyScalar(t.visible?.02*t.intensity:0),o.cosOuter.value[e]=Math.cos(t.angle),o.cosInner.value[e]=Math.cos(t.angle*(1-t.penumbra))}}}e.s(["DustMotes",0,i])},7210,e=>{"use strict";var t=e.i(90072),i=e.i(81395),s=e.i(54181),o=e.i(27941),a=e.i(22534),r=e.i(50885),n=e.i(97045),l=e.i(44353),h=e.i(20547),u=e.i(41343),c=e.i(68865);let d=[[0,"b_enhaut_s"],[.12,"b_enhaut_s"],[.36,"b_seconde_s"],[.54,"b_bas_s"],[.66,"b_reverence_pocetak"],[.76,"b_reverence_duboka"],[.86,"b_reverence_duboka"],[.96,"b_zavrsna"],[1,"b_zavrsna"]],f=[{p:0,az:-6,dist:1.15,h:2.42,tx:-.2,ty:1.55,tz:-.35,mm:50},{p:.32,az:10,dist:2.3,h:1.98,tx:-.3,ty:1.38,tz:-.15,mm:45},{p:.62,az:22,dist:4,h:1.62,tx:0,ty:.98,tz:0,mm:40},{p:.82,az:40,dist:4.6,h:1.55,tx:0,ty:.85,tz:0,mm:40},{p:1,az:36,dist:7.2,h:2.6,tx:0,ty:.9,tz:0,mm:35}];class p{scene=new t.Scene;camera=(0,i.lensCamera)(50);figure;back;key;top;beams=[];pixelScale=1.7;contact=new a.ContactShadows({width:3,depth:3,far:1.2,blur:2.2,opacity:.85,darkness:1.9});dust;progress=0;orbit=!0;smoothP=0;time=0;engine=null;v=new t.Vector3;t=new t.Vector3;constructor(){this.scene.background=new t.Color("#c3bbae"),this.scene.fog=new t.Fog("#c3bbae",8,24);const e=new t.Mesh(new t.PlaneGeometry(30,30),function(){let e=new t.MeshPhysicalMaterial({color:"#bfb7aa",roughness:.78,metalness:0,clearcoat:.15,clearcoatRoughness:.5,envMapIntensity:.6});return(0,l.extendMaterial)(e,{key:"ballet-floor",hooks:{color_fragment:`
        {
          // svijetle daske pozornice, blago istrošene (proceduralno)
          vec3 p = vWorldPos;
          float plank = abs( fract( p.x * 3.2 ) - 0.5 );
          float seam = 1.0 - smoothstep( 0.475, 0.5, plank );
          float wear = fbm3( vec3( p.x * 0.5, 0.0, p.z * 0.5 ) );
          diffuseColor.rgb *= ( 0.94 + 0.08 * wear ) * ( 1.0 - ( 1.0 - seam ) * 0.18 );
        }
      `}})}());e.rotation.x=-Math.PI/2,e.receiveShadow=!0,this.scene.add(e);const i=new t.Mesh(function(){let e=[];for(let i=0;i<=24;i++){let s=i/24*(Math.PI/2);e.push(new t.Vector2(-2.2+2.2*Math.sin(s),2.2-2.2*Math.cos(s)))}e.push(new t.Vector2(0,12));let i=new t.BufferGeometry,s=[],o=[];for(let t=0;t<e.length;t++)for(let i=0;i<=8;i++)s.push(-15+30*i/8,e[t].y,e[t].x);for(let t=0;t<e.length-1;t++)for(let e=0;e<8;e++){let i=9*t+e,s=i+8+1;o.push(i,i+1,s,s,i+1,s+1)}return i.setAttribute("position",new t.Float32BufferAttribute(s,3)),i.setIndex(o),i.computeVertexNormals(),i}(),new t.MeshStandardMaterial({color:"#bdb5a8",roughness:.95}));for(const[e,s,r]of(i.position.z=-7,i.receiveShadow=!0,this.scene.add(i),this.scene.add(this.contact.group),this.figure=new n.Figure({look:"wood"}),this.scene.add(this.figure.group),(0,a.enableContact)(this.figure.group),this.figure.setPose((0,u.getPose)("b_enhaut")),this.key=new t.SpotLight("#ffe6cc",220,0,t.MathUtils.degToRad(15),.6,2),this.key.position.set(.9,6.6,2.4),this.key.target.position.set(0,1,0),(0,o.configurePCSSSpot)(this.key,.9,2048),this.back=new t.SpotLight("#e3ebff",160,0,t.MathUtils.degToRad(14),.6,2),this.back.position.set(2.2,5,-3.6),this.back.target.position.set(0,1.3,0),this.top=new t.SpotLight("#fff4e6",0,0,t.MathUtils.degToRad(12.5),.75,2),this.top.position.set(.15,7.4,.3),this.top.target.position.set(0,0,0),(0,o.configurePCSSSpot)(this.top,.35,2048),[[-2.8,-4,-1.9],[3,-4.4,2.2]])){const i=new t.SpotLight("#fff8ef",110,0,t.MathUtils.degToRad(7),.9,2);i.position.set(e,8.6,s),i.target.position.set(r,0,s-1.6),this.beams.push(i)}for(const e of this.beams)e.intensity=0;for(const e of[this.back,this.key,this.top,...this.beams])this.scene.add(e,e.target);this.scene.add(new t.HemisphereLight("#fffaf2","#a8a093",.22)),this.dust=new r.DustMotes({count:700,box:new t.Box3(new t.Vector3(-2,.2,-3),new t.Vector3(2,4.5,1.6)),size:.006}),this.dust.setLights([this.key,this.top]),this.dust.uniforms.gain.value=.6,this.scene.add(this.dust.points)}showAllForCompile(){let e=this.top.intensity;return this.top.intensity=1,()=>this.top.intensity=e}prepareEnvironment(e){this.scene.environment??=(0,s.buildEnvironment)(e,{top:"#f4efe6",horizon:"#e6e0d5",bottom:"#b9b2a6",boxes:[{dir:[-.6,.7,.6],size:[10,8],intensity:3.2,color:"#fffaf2",softness:.7},{dir:[.2,.4,-1],size:[12,8],intensity:2.4,color:"#fff4e6",softness:.8},{dir:[.8,.3,.4],size:[6,10],intensity:1.2,color:"#ffffff",softness:.8}]})}activate(e){this.engine=e,this.prepareEnvironment(e.renderer),this.scene.environmentIntensity=.6,this.figure.viewCamera=this.camera,e.post.configure({exposure:1.05,ao:{radius:.1,falloff:.6,intensity:1.3},volumetric:{lights:[{light:this.key,density:1.4,shadow:!0,scale:5.5,tint:"#ffd9b3"},{light:this.top,density:1.4,shadow:!0,scale:5}],settings:{density:.08,ambientDensity:9e-4,ambientColor:"#efe8dc",heightFalloff:.15,floorY:0,noiseScale:.28,noiseAmount:.7,g:.5,intensity:1}},dof:{focus:2,range:1.2,bokeh:3},bloom:{intensity:.2,threshold:9,smoothing:.4,radius:.6},vignette:{darkness:.32,offset:.3},grain:.05})}setTier(e){let t="high"===e?2048:1024;this.key.shadow.mapSize.set(t,t),this.top.shadow.mapSize.set(t,t)}pose(e,t){let i=(0,u.getPose)(d[0][1]);for(let t=0;t<d.length-1;t++){let[s,o]=d[t],[a,r]=d[t+1];if(e>=s&&e<=a){i=a===s?(0,u.getPose)(o):(0,c.blendPose)((0,u.getPose)(o),(0,u.getPose)(r),(0,h.smootherstep)((e-s)/(a-s)));break}}return(0,h.applySecondary)(i,t,{breath:1,sway:.3}),i}cameraAt(e){let i=0;for(;i<f.length-2&&f[i+1].p<e;)i++;let s=f[i],o=f[i+1],a=(0,h.smootherstep)(Math.min(1,Math.max(0,(e-s.p)/(o.p-s.p)))),r=(e,t)=>e+(t-e)*a,n=t.MathUtils.degToRad(this.orbit?r(s.az,o.az):26),l=this.camera.aspect<.8,u=r(s.dist,o.dist)*(l?1.18:1),c=r(s.h,o.h)+.12*!!l;this.v.set(Math.sin(n)*u,c+.006*Math.sin(.4*this.time),Math.cos(n)*u),this.t.set(l?0:r(s.tx,o.tx),r(s.ty,o.ty)+.32*!!l,r(s.tz,o.tz)),this.camera.position.copy(this.v),this.camera.lookAt(this.t);let d=r(s.mm,o.mm);Math.abs(this.camera.getFocalLength()-d)>.01&&this.camera.setFocalLength(d)}snap(){this.smoothP=this.progress}update(e){this.time+=e,this.smoothP+=(this.progress-this.smoothP)*Math.min(1,10*e);let s=this.smoothP;this.figure.setPose(this.pose(s,this.time));let o=(0,h.smootherstep)(Math.min(1,Math.max(0,(s-.7)/.22)));this.top.intensity=260*o,o>.001&&!this.top.shadow.autoUpdate&&(this.top.shadow.needsUpdate=!0),this.top.shadow.autoUpdate=o>.001,this.back.intensity=160,this.key.intensity=220*(1-.5*o);let a=this.figure.map.pelvis;if(a){let e=this.figure.toWorld(new t.Vector3(...a.S));this.top.target.position.set(e.x,0,e.z),this.top.position.set(e.x+.15,7.4,e.z+.3)}if(this.cameraAt(s),this.engine){this.contact.update(this.engine.renderer,this.scene),this.dust.update(e,this.camera,this.engine.height);let s=this.figure.map.head,o=s?this.figure.toWorld(new t.Vector3(...s.S).addScaledVector(new t.Vector3(...s.M.y),.5*s.L)):this.t,a=this.camera.position.distanceTo(o);this.engine.post.dof.cocMaterial.focusDistance=a,this.engine.post.dof.cocMaterial.focusRange=Math.max(.35,(0,i.depthOfField)(this.camera.getFocalLength(),2.4,a).range)}return!0}}e.s(["BalletScene",0,p])}]);
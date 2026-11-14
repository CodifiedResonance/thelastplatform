/* THE LAST PLATFORM: the chambers, in three dimensions.
   Glass that refracts, liquid with depth, bubbles, brushed metal, a floor that holds the light.
   platform.js runs everything (turning, waking, entering). This file only draws it, in two kinds of stage:
   the drum at the top, and the shelves below it, where the worlds that have settled stand.
   If WebGL is not there, platform.js keeps drawing the flat chambers instead. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const LP = window.LP;
if (LP) {
  try {
    const K = kit();
    const drum = stage(K, { host: LP.ring, srcs: LP.chambers, layout: "drum" });
    (LP.shelves || []).forEach((sh) => { try { sh.attach(stage(K, { host: sh.host, srcs: sh.bays, layout: "shelf" })); } catch (e) { console.warn("shelf:", e); } });
    LP.attach(drum);
  } catch (err) { console.warn("chambers3d:", err); }
}

/* ---------------------------------------------------------------- the parts */
function kit() {
  /* dimensions, in metres or near enough */
  const TR = 0.5, TL = 2.2;                 /* tube radius, straight length */
  const HALF = TL / 2 + TR;                 /* half the glass */
  const CAPH = 0.36, FOOT = 0.08;
  const FLOOR = -(HALF + CAPH + FOOT - 0.12);
  const LEVEL = HALF - 0.62;                /* where the liquid stops */
  const RING = 2.15;                        /* drum radius */
  const FOG = [8.0, 10.9];
  const CORE = -0.3;
  const TANK = 3.3;                         /* how much wider a tank is than a capsule */

  const NOISE = `
    float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+7.1;a*=.5;}return s;}`;
  const FOGF = `float fogk(float z){return 1.-smoothstep(${FOG[0].toFixed(2)},${FOG[1].toFixed(2)},z);}`;
  const glassGeo = new THREE.CapsuleGeometry(TR, TL, 24, 72);
  const liquidGeo = new THREE.CapsuleGeometry(TR * 0.9, TL, 20, 56);
  const bubbleGeo = new THREE.SphereGeometry(1, 14, 10);
  const coreGeo = new THREE.PlaneGeometry(0.86, 1.72);
  const capGeo = new THREE.CylinderGeometry(TR * 1.26, TR * 1.26, CAPH, 72);
  const lipGeo = new THREE.CylinderGeometry(TR * 1.31, TR * 1.31, 0.045, 72);
  const footGeo = new THREE.CylinderGeometry(TR * 1.5, TR * 1.58, FOOT, 72);
  const rodGeo = new THREE.CylinderGeometry(0.032, 0.032, HALF * 2 + 0.2, 12);
  const ledGeo = new THREE.SphereGeometry(0.02, 12, 8);
  const surfGeo = new THREE.CircleGeometry(TR * 0.9, 48);
  const poolGeo = new THREE.PlaneGeometry(4.6, 4.6);

  const metal = new THREE.MeshPhysicalMaterial({ color: 0x24262a, metalness: 1, roughness: 0.36,
    anisotropy: 0.75, anisotropyRotation: Math.PI / 2, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9ea6, metalness: 1, roughness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.9, roughness: 0.5 });

  /* a little condensation: the glass is not perfectly clean */
  function smudge() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "rgb(0,14,0)"; x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 520; i++) {
      const y = Math.pow(Math.random(), 0.6) * 512, r = 2 + Math.random() * 16;
      x.fillStyle = "rgba(0," + Math.round(40 + Math.random() * 90) + ",0," + (0.03 + Math.random() * 0.06) + ")";
      x.beginPath(); x.ellipse(Math.random() * 256, y, r * 0.5, r * (1 + Math.random() * 3), 0, 0, 6.3); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05,
    roughnessMap: smudge(), transmission: 1, thickness: 0.42, ior: 1.46, dispersion: 0.6,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.2, specularIntensity: 1 });
  function liquidMaterial(feel, ph, forming) {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uA: { value: new THREE.Color(feel.liquid[0]) }, uB: { value: new THREE.Color(feel.liquid[1]) },
        uG: { value: new THREE.Color(feel.glow || feel.liquid[0]) }, uE: { value: 0.14 }, uT: { value: 0 }, uPh: { value: ph }, uF: { value: forming ? 1 : 0 } },
      vertexShader: `varying vec3 vP;varying vec3 vN;varying vec3 vV;
        void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uA,uB,uG;uniform float uE,uT,uPh,uF;varying vec3 vP;varying vec3 vN;varying vec3 vV;
        ${NOISE}${FOGF}
        void main(){
          float lv=${LEVEL.toFixed(3)}+sin(vP.x*7.+uT*1.3)*.012+sin(vP.z*5.-uT*1.7)*.01;
          if(vP.y>lv)discard;
          float h=smoothstep(${(-HALF).toFixed(3)},lv,vP.y);
          float thick=pow(abs(dot(normalize(vN),normalize(-vV))),1.4);
          float breath=.5+.5*sin(uT*.7+uPh);
          float murk=fbm(vec3(vP.x*2.2,vP.y*1.3-uT*.07,vP.z*2.2)+uPh);
          float wisps=fbm(vec3(vP.x*5.,vP.y*2.4-uT*.22,vP.z*5.)-uPh);
          vec3 col=mix(uB,uA,h*h)*(.05+uE*(.42+.16*breath))*(.08+.92*thick*thick)*(.35+1.2*murk);
          col+=uG*uE*pow(thick,4.)*(.16+.14*breath)*(.3+1.4*wisps);
          float shaft=pow(noise(vec3(vP.x*9.+uT*.3,uT*.25,vP.z*9.)),3.)*smoothstep(lv-1.5,lv,vP.y);
          col+=uA*uE*shaft*.7;
          float band=exp(-pow((vP.y-(${CORE.toFixed(3)}))/.6,2.));
          float churn=fbm(vec3(vP.x*4.+sin(uT*.3)*.6,vP.y*3.+uT*.3,vP.z*4.)+uPh*2.);
          col+=uG*uF*band*pow(thick,2.)*(.05+.07*(.5+.5*sin(uT*1.15+uPh)))*(.3+1.7*churn);
          col*=smoothstep(lv,lv-.05,vP.y)*.35+.65;
          gl_FragColor=vec4(col*fogk(-vV.z),1.);
        }`
    });
  }
  function bubbleMaterial(feel) {
    return new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uG: { value: new THREE.Color(feel.glow || feel.liquid[0]) }, uE: { value: 0.14 } },
      vertexShader: `varying vec3 vN;varying vec3 vV;
        void main(){vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.);vV=mv.xyz;vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uG;uniform float uE;varying vec3 vN;varying vec3 vV;${FOGF}
        void main(){vec3 n=normalize(vN),v=normalize(-vV);
          float rim=pow(1.-abs(dot(n,v)),2.2);
          float spec=pow(max(dot(n,normalize(vec3(-.35,.8,.5))),0.),48.);
          float low=pow(max(dot(n,vec3(0.,-1.,0.)),0.),3.)*.35;
          vec3 col=(mix(vec3(1.),uG,.45)*(rim*.8+low)+vec3(spec*2.2))*(.12+uE*.95);
          gl_FragColor=vec4(col*fogk(-vV.z),1.);}`
    });
  }
  function surfaceMaterial(feel) {
    return new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uA: { value: new THREE.Color(feel.liquid[0]) }, uE: { value: 0.14 }, uT: { value: 0 } },
      vertexShader: `varying vec2 vU;varying vec3 vV;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uA;uniform float uE,uT;varying vec2 vU;varying vec3 vV;${FOGF}
        void main(){float r=length(vU-.5)*2.;float edge=smoothstep(.72,1.,r);
          float rip=.5+.5*sin(r*26.-uT*2.2);
          vec3 col=mix(vec3(.5),uA,.6)*(edge*.9+rip*.07)*(.1+uE*.7);
          gl_FragColor=vec4(col*fogk(-vV.z),1.);}`
    });
  }
  /* something forming: a mass gathering at the core of the liquid, not yet a world */
  function coreMaterial(feel, ph) {
    return new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uG: { value: new THREE.Color(feel.glow || feel.liquid[0]) }, uE: { value: 0.3 }, uT: { value: 0 }, uPh: { value: ph } },
      vertexShader: `varying vec2 vU;varying vec3 vV;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uG;uniform float uE,uT,uPh;varying vec2 vU;varying vec3 vV;${NOISE}${FOGF}
        void main(){vec2 p=(vU-.5)*vec2(1.,2.);
          float r=length(p*vec2(1.,.6));float ang=atan(p.y,p.x);
          float beat=.5+.5*sin(uT*1.15+uPh);
          float n=fbm(vec3(p*3.4+vec2(cos(uT*.21),sin(uT*.17))*.7,uT*.3+uPh));
          float n2=fbm(vec3(p*7.-vec2(0.,uT*.12),uT*.45-uPh));
          float body=smoothstep(.36+.07*beat,.02,r+(n-.5)*.34);
          float heart=exp(-r*r*40.)*(.04+.06*beat);
          float tend=pow(fbm(vec3(ang*1.6+uPh,r*6.+uT*.55,uT*.1)),2.2)*smoothstep(.48,.12,r)*smoothstep(.0,.1,r);
          vec3 col=uG*(body*(.12+.4*n2*n2)+tend*.4)+mix(uG,vec3(1.),.4)*heart;
          col*=(.2+uE*1.5)*smoothstep(.5,.4,r);
          gl_FragColor=vec4(col*fogk(-vV.z),1.);}`
    });
  }
  /* what a world holds of itself: a faint moving picture of where you are going,
     too small to notice until you look properly */
  function visionMaterial(feel, kind, aspect, ph) {
    return new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uG: { value: new THREE.Color(feel.glow || feel.liquid[0]) }, uE: { value: 0.3 }, uT: { value: 0 },
        uK: { value: kind === "orbits" ? 2 : 1 }, uAsp: { value: aspect }, uPh: { value: ph } },
      vertexShader: `varying vec2 vU;varying vec3 vV;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uG;uniform float uE,uT,uK,uAsp,uPh;varying vec2 vU;varying vec3 vV;${NOISE}${FOGF}
        void main(){
          vec2 e=min(vU,1.-vU);float edge=smoothstep(0.,.18,e.x*uAsp)*smoothstep(0.,.14,e.y);
          vec3 col=vec3(0.);
          if(uK<1.5){
            /* deep space: a scatter of stars drifting, one or two that catch, a faint dust */
            vec2 p=(vU-.5)*vec2(uAsp,1.)*7.+vec2(uT*.035,uT*.012)+uPh;
            vec2 c=floor(p),f=fract(p)-.5;
            float h=hash(vec3(c,3.1));
            vec2 o=vec2(hash(vec3(c,1.7)),hash(vec3(c,9.2)))-.5;
            float d=length(f-o*.7);
            float tw=.35+.65*pow(.5+.5*sin(uT*(.4+h*1.6)+h*61.),10.);
            float s=step(.82,h)*exp(-d*d*(380.-h*150.))*tw;
            float big=step(.985,h)*exp(-d*d*60.)*pow(.5+.5*sin(uT*.6+h*20.),14.)*1.6;
            float dust=pow(fbm(vec3(p*.35,uT*.015)),3.)*.5;
            col=vec3(.82,.88,1.)*(s+big)+mix(uG,vec3(.5,.6,.9),.5)*dust*.35;
          } else {
            /* a planetary system, seen a little from above: a star, its paths, its worlds going round */
            vec2 p=(vU-.5)*vec2(uAsp,1.)*2.4;
            vec2 q=vec2(p.x,p.y*2.7);
            float r=length(q);
            col+=vec3(1.,.93,.8)*(exp(-r*r*900.)*1.4+exp(-r*5.)*.07);
            for(int i=0;i<4;i++){
              float fi=float(i);float R=.15+fi*.13+fi*fi*.02;
              col+=uG*exp(-pow((r-R)/.0035,2.))*.11;
              float a=uT*(.42/(1.+fi*1.2))+fi*2.3+uPh;
              vec2 pp=vec2(cos(a),sin(a)/2.7)*R;
              float dd=length(p-pp);
              float behind=sin(a)<0.&&abs(pp.x)<.03?.3:1.;
              col+=mix(uG,vec3(1.),.5)*exp(-dd*dd*(5200.-fi*900.))*behind*1.2;
            }
          }
          col*=edge*(.3+uE*1.3);
          gl_FragColor=vec4(col*fogk(-vV.z),1.);}`
    });
  }
  function nameTexture(text, blurred) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 1024;
    const x = c.getContext("2d");
    x.translate(128, 512); x.rotate(Math.PI / 2);
    x.font = "500 58px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
    x.textAlign = "center"; x.textBaseline = "middle";
    try { x.letterSpacing = "22px"; } catch (e) {}
    let size = 58;
    while (x.measureText(text).width > 900 && size > 20) { size -= 3; x.font = "500 " + size + "px 'IBM Plex Mono', ui-monospace, Menlo, monospace"; }
    if (blurred) { x.shadowColor = "#fff"; x.shadowBlur = 26; x.shadowOffsetX = 3000; x.fillStyle = "#fff"; x.fillText(text, 0, -3000);
      x.shadowBlur = 44; x.fillText(text, 0, -3000); }
    else { x.fillStyle = "#fff"; x.fillText(text, 0, 0); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function nameMaterial(w) {
    const m = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { tS: { value: null }, tB: { value: null }, uE: { value: 0 }, uInk: { value: new THREE.Color(0xffffff) } },
      vertexShader: `varying vec2 vU;varying vec3 vV;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform sampler2D tS,tB;uniform float uE;uniform vec3 uInk;varying vec2 vU;varying vec3 vV;${FOGF}
        void main(){float k=smoothstep(.5,.97,uE);
          float a=mix(texture2D(tB,vU).r*.3,texture2D(tS,vU).r*.8,k);
          gl_FragColor=vec4(uInk*a*fogk(-vV.z),1.);}`
    });
    const paint = () => { m.uniforms.tS.value = nameTexture(w.name.toUpperCase(), false); m.uniforms.tB.value = nameTexture(w.name.toUpperCase(), true); };
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    return m;
  }
  /* the number is cut into the cap itself: the cap's own metal, with a chiselled groove
     (a height map the light falls into) and a darker cavity at the bottom of the cut */
  function engraved(text, sx) {
    const W = 512, H = 384, U0 = 0.044;            /* the strip of the cap's face this canvas covers */
    const span = (W / H) * CAPH / (2 * Math.PI * TR * 1.26);
    const glyphs = (fill, blur) => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
      x.font = "400 104px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
      x.textAlign = "center"; x.textBaseline = "middle";
      try { x.letterSpacing = "10px"; } catch (e) {}
      x.filter = "blur(" + blur + "px)"; x.fillStyle = fill;
      x.save(); x.translate(W / 2, H / 2 + 6); x.scale(1 / sx, 1); x.fillText(text, 0, 0); x.restore();
      const t = new THREE.CanvasTexture(c);
      t.repeat.set(1 / span, 1); t.offset.set(-U0 / span, 0); t.anisotropy = 8;
      return t;
    };
    const m = metal.clone();
    m.bumpMap = glyphs("#000", 2.2); m.bumpScale = 2.0;      /* the V of the cut */
    const cav = glyphs("#a2a5aa", 1.2); cav.colorSpace = THREE.SRGBColorSpace;
    m.map = cav;                                               /* a touch less reflective in the groove */
    m.color.set(0xffffff).multiply(new THREE.Color(0x24262a));
    return m;
  }
  const poolTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, "#fff"); g.addColorStop(0.3, "#555"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  function falloff(horizontal) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = horizontal ? x.createLinearGradient(0, 0, 256, 0) : x.createRadialGradient(128, 128, 0, 128, 128, 128);
    if (horizontal) { g.addColorStop(0, "#000"); g.addColorStop(0.3, "#fff"); g.addColorStop(0.7, "#fff"); g.addColorStop(1, "#000"); }
    else { g.addColorStop(0, "#fff"); g.addColorStop(0.45, "#bbb"); g.addColorStop(1, "#000"); }
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    if (horizontal) {            /* and it runs back into the dark */
      const v = x.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.55, "rgba(0,0,0,.15)"); v.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = v; x.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  }

  function seed(b, anywhere, forming, sx) {
    const born = forming && !anywhere;    /* what is forming gives off its own bubbles */
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * TR * (born ? 0.3 : 0.74) * sx;
    b.x = Math.cos(a) * r; b.z = Math.sin(a) * r * Math.min(sx, 1.6);
    b.y = anywhere ? -HALF + 0.2 + Math.random() * (LEVEL + HALF - 0.2) : born ? CORE - 0.2 + Math.random() * 0.5 : -HALF + 0.15;
    b.r = 0.008 + Math.pow(Math.random(), 2.4) * 0.05;
    b.v = 0.1 + b.r * 9 + Math.random() * 0.1; b.ph = Math.random() * 6.283;
    return b;
  }

  /* one chamber: a capsule, or (form: "tank") a wider tank */
  function unit(src, i, hoseEnd) {
    const feel = src.feel, w = src.world, sx = src.form === "tank" ? TANK : 1, sz = Math.min(sx, 1.6);
    const g = new THREE.Group();
    const body = new THREE.Group(); body.scale.set(sx, 1, sz); g.add(body);

    const liquid = new THREE.Mesh(liquidGeo, liquidMaterial(feel, i * 1.7, !!src.forming)); liquid.renderOrder = 1;
    const surf = new THREE.Mesh(surfGeo, surfaceMaterial(feel)); surf.rotation.x = -Math.PI / 2; surf.position.y = LEVEL; surf.renderOrder = 2;
    body.add(liquid, surf);
    const COUNT = Math.round(54 * Math.sqrt(sx) * 1.2);
    const bub = new THREE.InstancedMesh(bubbleGeo, bubbleMaterial(feel), COUNT); bub.renderOrder = 3; bub.frustumCulled = false;
    const list = [];
    for (let k = 0; k < COUNT; k++) list.push(seed({}, true, !!src.forming, sx));
    g.add(bub);

    let core = null, name = null, vision = null;
    if (src.forming) {
      core = coreMaterial(feel, i * 2.3);
      for (let q = 0; q < 2; q++) { const c = new THREE.Mesh(coreGeo, core); c.position.y = CORE; c.rotation.y = q * Math.PI / 2; c.renderOrder = 2; g.add(c); }
    }
    if (w && w.vision) {
      const vw = TR * 1.5 * sx, vh = 2.1;
      vision = visionMaterial(feel, w.vision, vw / vh, i * 1.3);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(vw, vh), vision); v.position.set(0, -0.12, -0.06 + (sz - 1) * 0.1); v.renderOrder = 2; g.add(v);
    }
    if (w || src.forming) {
      name = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 2.48), nameMaterial(w || src.forming));
      name.position.set(0, -0.2, 0.02 + (sz - 1) * 0.3); name.renderOrder = 2; g.add(name);
    }
    body.add(new THREE.Mesh(glassGeo, glass));

    /* the apparatus */
    const capY = HALF - 0.14 + CAPH / 2;
    const top = new THREE.Mesh(capGeo, src.no ? [engraved(String(src.no).padStart(2, "0"), sx), metal, metal] : metal); top.position.y = capY;
    const base = new THREE.Mesh(capGeo, metal); base.position.y = -capY;
    const lipT = new THREE.Mesh(lipGeo, steel); lipT.position.y = HALF - 0.14;
    const lipB = new THREE.Mesh(lipGeo, steel); lipB.position.y = -(HALF - 0.14);
    const foot = new THREE.Mesh(footGeo, dark); foot.position.y = FLOOR + FOOT / 2;
    body.add(top, base, lipT, lipB, foot);
    const rx = 0.47 * (sx > 1 ? sx * 0.96 : 1);
    const r1 = new THREE.Mesh(rodGeo, steel); r1.position.set(-rx, 0, -0.5 * sz);
    const r2 = new THREE.Mesh(rodGeo, steel); r2.position.set(rx, 0, -0.5 * sz);
    g.add(r1, r2);
    const zb = -0.2 * sz;
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, HALF + CAPH - 0.16, zb), new THREE.Vector3(0, HALF + CAPH + 0.5, zb - 0.3),
      new THREE.Vector3(0, HALF + CAPH + 0.75, zb - 1.0), new THREE.Vector3(0, hoseEnd[0], hoseEnd[1])]), 28, 0.07, 10), dark);
    g.add(hose);
    if (sx > 1) {      /* a tank draws from two lines */
      const h2 = hose.clone(); h2.position.x = -TR * sx * 0.55; const h3 = hose.clone(); h3.position.x = TR * sx * 0.55; g.add(h2, h3); hose.visible = false;
    }

    const ledMat = new THREE.MeshBasicMaterial({ color: 0x1c170c });
    const led1 = new THREE.Mesh(ledGeo, ledMat); led1.position.set(0, capY, TR * 1.26 * sz);
    const led2 = new THREE.Mesh(ledGeo, ledMat); led2.position.set(0, -capY, TR * 1.26 * sz);
    g.add(led1, led2);

    /* the light it throws on the floor */
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, color: 0x000000,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: true }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = FLOOR + 0.004; pool.scale.set(Math.sqrt(sx) * (sx > 1 ? 1.4 : 1), 1, 1); pool.renderOrder = 6; g.add(pool);

    /* what the floor holds of it */
    const mirror = new THREE.Group();
    mirror.add(new THREE.Mesh(liquidGeo, liquid.material), top.clone(), base.clone(), lipT.clone(), lipB.clone());
    mirror.scale.set(sx, -1, sz); mirror.position.y = FLOOR * 2; g.add(mirror);

    return { src, g, sx, liquid, surf, bub, list, name, core, vision, ledMat, pool,
      glowCol: new THREE.Color(feel.glow || feel.liquid[0]), gold: new THREE.Color(0xc9a24b),
      off: new THREE.Color(w || src.forming ? 0x4a3c1c : 0x1c170c) };
  }

  const tmp = new THREE.Object3D();
  function animate(u, i, e, awake, near, dt, simT) {
    u.liquid.material.uniforms.uE.value = e; u.liquid.material.uniforms.uT.value = simT;
    u.surf.material.uniforms.uE.value = e; u.surf.material.uniforms.uT.value = simT;
    u.bub.material.uniforms.uE.value = e;
    if (u.name) { u.name.material.uniforms.uE.value = e; const s = 0.94 + 0.06 * e; u.name.scale.set(s, s, 1); }
    if (u.vision) { u.vision.uniforms.uE.value = e; u.vision.uniforms.uT.value = simT; }
    const beat = 0.5 + 0.5 * Math.sin(simT * 1.15 + i * 2.3);
    u.pool.material.color.copy(u.glowCol).multiplyScalar(Math.max(0, e - 0.1) * (u.src.world ? 0.55 : u.src.forming ? 0.25 + 0.3 * beat : 0.12));
    if (u.core) { u.core.uniforms.uE.value = e; u.core.uniforms.uT.value = simT; }
    if (u.src.forming) u.ledMat.color.copy(u.off).lerp(u.gold, 0.15 + 0.6 * beat).multiplyScalar(1 + 1.2 * beat);
    else u.ledMat.color.copy(u.off).lerp(u.gold, awake ? 1 : 0).multiplyScalar(awake ? 3.2 : 1);
    if (!near) return;
    const live = Math.round((8 + e * 46) * Math.sqrt(u.sx) * 1.2);
    u.bub.count = Math.min(live, u.list.length);
    for (let k = 0; k < u.bub.count; k++) {
      const b = u.list[k];
      b.y += b.v * dt * (0.3 + e * 1.5);
      if (b.y > LEVEL - b.r) seed(b, false, !!u.src.forming, u.sx);
      const grow = 1 + (b.y + HALF) * 0.12;
      tmp.position.set(b.x + Math.sin(simT * 2.3 + b.ph) * 0.02, b.y, b.z + Math.cos(simT * 1.9 + b.ph) * 0.02);
      const wob = 1 + Math.sin(simT * 7 + b.ph) * 0.08;
      tmp.scale.set(b.r * grow * wob, b.r * grow / wob, b.r * grow * wob);
      tmp.updateMatrix(); u.bub.setMatrixAt(k, tmp.matrix);
    }
    u.bub.instanceMatrix.needsUpdate = true;
  }

  return { TR, HALF, CAPH, FLOOR, RING, FOG, TANK, metal, steel, dark, unit, animate, falloff };
}

/* ---------------------------------------------------------------- a stage: one canvas, one set of chambers */
function stage(K, spec) {
  const host = spec.host, drumLayout = spec.layout === "drum";
  const N = spec.srcs.length, STEP = (Math.PI * 2) / N;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement;
  cv.className = "gl";
  cv.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, K.FOG[0], K.FOG[1] + (drumLayout ? 0 : 3));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
  const key = new THREE.DirectionalLight(0xdfe4ee, 0.9);
  key.position.set(-3, 6, 8);
  scene.add(key);

  const holder = new THREE.Group(); scene.add(holder);
  let units, contentW = 0;
  if (drumLayout) {
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 9, 40), K.dark);
    spine.position.y = 1.2; holder.add(spine);
    units = spec.srcs.map((src, i) => {
      const u = K.unit(src, i, [K.HALF + K.CAPH + 0.7, -K.RING + 0.3]), a = i * STEP;
      u.g.position.set(Math.sin(a) * K.RING, 0, Math.cos(a) * K.RING); u.g.rotation.y = a;
      holder.add(u.g); return u;
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x040405, metalness: 0.9, roughness: 0.3, envMapIntensity: 0.25,
        transparent: true, opacity: 0.9, alphaMap: K.falloff(false) }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, K.FLOOR, K.RING * 0.6); floor.renderOrder = 5;
    scene.add(floor);
  } else {
    /* a shelf: the chambers stand in a row on a slab of dark steel, lines running back into the dark */
    const GAP = 1.0;
    const widths = spec.srcs.map((s) => K.TR * 1.6 * (s.form === "tank" ? K.TANK : 1));
    contentW = widths.reduce((a, b) => a + b, 0) + GAP * (N - 1);
    let x = -contentW / 2;
    units = spec.srcs.map((src, i) => {
      const u = K.unit(src, i, [K.HALF + K.CAPH + 1.6, -2.4]);
      u.g.position.set(x + widths[i] / 2, 0, 0); x += widths[i] + GAP;
      u.halfW = widths[i] / 2; holder.add(u.g); return u;
    });
    const W = Math.max(14, contentW * 2.2);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(W, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x040405, metalness: 0.9, roughness: 0.3, envMapIntensity: 0.12,
        transparent: true, opacity: 0.9, alphaMap: K.falloff(true) }));
    slab.rotation.x = -Math.PI / 2; slab.position.set(0, K.FLOOR, -0.1); slab.renderOrder = 5; scene.add(slab);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 1, roughness: 0.4, envMapIntensity: 0.15, transparent: true, alphaMap: K.falloff(true), opacity: 1 });
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.16), edgeMat);
    edge.position.set(0, K.FLOOR - 0.08, 1.5); scene.add(edge);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.5, 0.008), new THREE.MeshBasicMaterial({ color: 0x2e2511, fog: true, transparent: true, alphaMap: K.falloff(true) }));
    line.position.set(0, K.FLOOR - 0.006, 1.505); scene.add(line);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.8, 0.7));
  composer.addPass(new OutputPass());

  let cw = 0, ch = 0;
  function size() {
    const w = host.clientWidth + (drumLayout ? LP.bleed() * 2 : 0), h = host.clientHeight;
    if (!w || !h) return;
    cw = w; ch = h;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h;
    if (drumLayout) {
      const dist = 7.7 * Math.max(1, 0.6 / camera.aspect);
      camera.position.set(0, 0.5, K.RING + dist); camera.lookAt(0, -0.12, K.RING);
    } else {
      const visW = 2 * 7.7 * Math.tan((15 * Math.PI) / 180) * camera.aspect;
      const dist = 7.7 * Math.max(1, (contentW + 1.2) / visW);
      camera.position.set(0, 0.55, dist); camera.lookAt(0, -0.12, 0);
    }
    camera.updateProjectionMatrix();
  }

  /* where each chamber sits on the page, so platform.js knows what the pointer is over */
  const v = new THREE.Vector3();
  function regions() {
    return units.map((u) => {
      const pts = [[-u.halfW, K.HALF + K.CAPH], [u.halfW, K.FLOOR]].map(([dx, dy]) => {
        v.set(u.g.position.x + dx, dy, u.halfW * 0.6).project(camera);
        return [(v.x + 1) / 2 * cw, (1 - v.y) / 2 * ch];
      });
      return { left: pts[0][0], top: pts[0][1], right: pts[1][0], bottom: pts[1][1] };
    });
  }

  let simT = 0;
  function render(state) {
    simT += state.dt;
    if (drumLayout) holder.rotation.y = -state.rot * STEP;
    for (let i = 0; i < N; i++) K.animate(units[i], i, state.energy[i], !!state.awake[i], state.near ? state.near[i] : true, state.dt, simT);
    composer.render();
  }

  size();
  render({ dt: 0, rot: 0, energy: spec.srcs.map(() => 0.14), awake: [], near: spec.srcs.map(() => true) });
  host.appendChild(cv);
  window.addEventListener("resize", size);
  return { render, size, regions };
}

/* THE LAST PLATFORM: the chambers, in three dimensions.
   Glass that refracts, liquid with depth, bubbles, brushed metal, a floor that holds the light.
   platform.js runs the drum (turning, waking, entering). This file only draws it.
   If WebGL is not there, platform.js keeps drawing the flat chambers instead. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const LP = window.LP;
if (LP) { try { start(); } catch (err) { console.warn("chambers3d:", err); } }

function start() {
  const ring = LP.ring, N = LP.count, STEP = (Math.PI * 2) / N;

  /* dimensions, in metres or near enough */
  const TR = 0.5, TL = 2.2;                 /* tube radius, straight length */
  const HALF = TL / 2 + TR;                 /* half the glass */
  const CAPH = 0.36, FOOT = 0.08;
  const FLOOR = -(HALF + CAPH + FOOT - 0.12);
  const LEVEL = HALF - 0.62;                /* where the liquid stops */
  const RING = 2.15;                        /* drum radius */
  const FOG = [8.0, 10.9];

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement;
  cv.className = "gl";
  cv.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, FOG[0], FOG[1]);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
  const key = new THREE.DirectionalLight(0xdfe4ee, 0.9);
  key.position.set(-3, 6, 8);
  scene.add(key);

  /* ---------- shared pieces ---------- */
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
  const CORE = -0.3;
  const coreGeo = new THREE.PlaneGeometry(0.86, 1.72);
  const capGeo = new THREE.CylinderGeometry(TR * 1.26, TR * 1.26, CAPH, 72);
  const lipGeo = new THREE.CylinderGeometry(TR * 1.31, TR * 1.31, 0.045, 72);
  const footGeo = new THREE.CylinderGeometry(TR * 1.5, TR * 1.58, FOOT, 72);
  const rodGeo = new THREE.CylinderGeometry(0.032, 0.032, HALF * 2 + 0.2, 12);
  const ledGeo = new THREE.SphereGeometry(0.02, 12, 8);
  const surfGeo = new THREE.CircleGeometry(TR * 0.9, 48);

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

  /* a world's name, held in the liquid */
  /* the number is cut into the cap itself: the cap's own metal, with a chiselled groove
     (a height map the light falls into) and a darker cavity at the bottom of the cut */
  function engraved(text) {
    const W = 512, H = 384, U0 = 0.044;            /* the strip of the cap's face this canvas covers */
    const span = (W / H) * CAPH / (2 * Math.PI * TR * 1.26);
    const glyphs = (fill, blur) => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
      x.font = "400 104px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
      x.textAlign = "center"; x.textBaseline = "middle";
      try { x.letterSpacing = "10px"; } catch (e) {}
      x.filter = "blur(" + blur + "px)"; x.fillStyle = fill; x.fillText(text, W / 2, H / 2 + 6);
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
          float a=mix(texture2D(tB,vU).r*.55,texture2D(tS,vU).r*3.2,k);
          gl_FragColor=vec4(uInk*a*fogk(-vV.z),1.);}`
    });
    const paint = () => { m.uniforms.tS.value = nameTexture(w.name.toUpperCase(), false); m.uniforms.tB.value = nameTexture(w.name.toUpperCase(), true); };
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    return m;
  }

  /* ---------- the drum ---------- */
  const poolGeo = new THREE.PlaneGeometry(4.6, 4.6);
  const poolTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, "#fff"); g.addColorStop(0.3, "#555"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const drum = new THREE.Group();
  scene.add(drum);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 9, 40), dark);
  spine.position.y = 1.2; drum.add(spine);

  const tmp = new THREE.Object3D();
  const units = LP.chambers.map((src, i) => {
    const feel = src.feel, g = new THREE.Group(), a = i * STEP;
    g.position.set(Math.sin(a) * RING, 0, Math.cos(a) * RING);
    g.rotation.y = a;
    drum.add(g);

    const liquid = new THREE.Mesh(liquidGeo, liquidMaterial(feel, i * 1.7, !!src.forming)); liquid.renderOrder = 1;
    const surf = new THREE.Mesh(surfGeo, surfaceMaterial(feel)); surf.rotation.x = -Math.PI / 2; surf.position.y = LEVEL; surf.renderOrder = 2;
    const COUNT = 54;
    const bub = new THREE.InstancedMesh(bubbleGeo, bubbleMaterial(feel), COUNT); bub.renderOrder = 3; bub.frustumCulled = false;
    const list = [];
    for (let k = 0; k < COUNT; k++) list.push(seed({}, true, !!src.forming));
    g.add(liquid, surf, bub);

    let name = null;
    let core = null;
    if (src.forming) {
      core = coreMaterial(feel, i * 2.3);
      for (let q = 0; q < 2; q++) { const c = new THREE.Mesh(coreGeo, core); c.position.y = CORE; c.rotation.y = q * Math.PI / 2; c.renderOrder = 2; g.add(c); }
    }
    if (src.world || src.forming) {
      name = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 2.48), nameMaterial(src.world || src.forming));
      name.position.set(0, -0.2, 0.02); name.renderOrder = 2; g.add(name);
    }
    g.add(new THREE.Mesh(glassGeo, glass));

    /* the apparatus */
    const hard = new THREE.Group();
    const top = new THREE.Mesh(capGeo, [engraved(String(i + 1).padStart(2, "0")), metal, metal]); top.position.y = HALF - 0.14 + CAPH / 2;
    const base = new THREE.Mesh(capGeo, metal); base.position.y = -(HALF - 0.14 + CAPH / 2);
    const lipT = new THREE.Mesh(lipGeo, steel); lipT.position.y = HALF - 0.14;
    const lipB = new THREE.Mesh(lipGeo, steel); lipB.position.y = -(HALF - 0.14);
    const foot = new THREE.Mesh(footGeo, dark); foot.position.y = FLOOR + FOOT / 2;
    const r1 = new THREE.Mesh(rodGeo, steel); r1.position.set(-0.47, 0, -0.5);
    const r2 = new THREE.Mesh(rodGeo, steel); r2.position.set(0.47, 0, -0.5);
    hard.add(top, base, lipT, lipB, foot, r1, r2);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, HALF + CAPH - 0.16, -0.2), new THREE.Vector3(0, HALF + CAPH + 0.5, -0.5),
      new THREE.Vector3(0, HALF + CAPH + 0.75, -1.2), new THREE.Vector3(0, HALF + CAPH + 0.7, -RING + 0.3)]), 28, 0.07, 10), dark);
    hard.add(hose);
    g.add(hard);

    const ledMat = new THREE.MeshBasicMaterial({ color: 0x1c170c });
    const led1 = new THREE.Mesh(ledGeo, ledMat); led1.position.set(0, top.position.y, TR * 1.26);
    const led2 = new THREE.Mesh(ledGeo, ledMat); led2.position.set(0, base.position.y, TR * 1.26);
    g.add(led1, led2);

    /* the light it throws on the floor */
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, color: 0x000000,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: true }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = FLOOR + 0.004; pool.renderOrder = 6; g.add(pool);
    const glowCol = new THREE.Color(feel.glow || feel.liquid[0]);

    /* what the floor holds of it */
    const mirror = new THREE.Group();
    mirror.add(new THREE.Mesh(liquidGeo, liquid.material), top.clone(), base.clone(), lipT.clone(), lipB.clone());
    mirror.scale.y = -1; mirror.position.y = FLOOR * 2; g.add(mirror);

    return { src, g, liquid, surf, bub, list, name, core, ledMat, pool, glowCol, gold: new THREE.Color(0xc9a24b), off: new THREE.Color(src.world || src.forming ? 0x4a3c1c : 0x1c170c) };
  });
  function seed(b, anywhere, forming) {
    const born = forming && !anywhere;    /* what is forming gives off its own bubbles */
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * TR * (born ? 0.3 : 0.74);
    b.x = Math.cos(a) * r; b.z = Math.sin(a) * r;
    b.y = anywhere ? -HALF + 0.2 + Math.random() * (LEVEL + HALF - 0.2) : born ? CORE - 0.2 + Math.random() * 0.5 : -HALF + 0.15;
    b.r = 0.008 + Math.pow(Math.random(), 2.4) * 0.05;
    b.v = 0.1 + b.r * 9 + Math.random() * 0.1; b.ph = Math.random() * 6.283;
    return b;
  }

  /* the floor: dark, polished, and it runs out into black */
  function falloff() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#fff"); g.addColorStop(0.45, "#bbb"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x040405, metalness: 0.9, roughness: 0.3, envMapIntensity: 0.25,
      transparent: true, opacity: 0.9, alphaMap: falloff() }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, RING * 0.6); floor.renderOrder = 5;
  scene.add(floor);

  /* ---------- the picture ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.8, 0.7);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function size() {
    const w = ring.clientWidth + LP.bleed() * 2, h = ring.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h;
    const dist = 7.7 * Math.max(1, 0.6 / camera.aspect);
    camera.position.set(0, 0.5, RING + dist);
    camera.lookAt(0, -0.12, RING);
    camera.updateProjectionMatrix();
  }

  let simT = 0;
  function render(state) {
    simT += state.dt;
    drum.rotation.y = -state.rot * STEP;
    for (let i = 0; i < N; i++) {
      const u = units[i], e = state.energy[i], near = state.near[i];
      u.liquid.material.uniforms.uE.value = e; u.liquid.material.uniforms.uT.value = simT;
      u.surf.material.uniforms.uE.value = e; u.surf.material.uniforms.uT.value = simT;
      u.bub.material.uniforms.uE.value = e;
      if (u.name) { u.name.material.uniforms.uE.value = e; const s = 0.94 + 0.06 * e; u.name.scale.set(s, s, 1); }
      const beat = 0.5 + 0.5 * Math.sin(simT * 1.15 + i * 2.3);
      u.pool.material.color.copy(u.glowCol).multiplyScalar(Math.max(0, e - 0.1) * (u.src.world ? 0.55 : u.src.forming ? 0.25 + 0.3 * beat : 0.12));
      if (u.core) { u.core.uniforms.uE.value = e; u.core.uniforms.uT.value = simT; }
      if (u.src.forming) u.ledMat.color.copy(u.off).lerp(u.gold, 0.15 + 0.6 * beat).multiplyScalar(1 + 1.2 * beat);
      else u.ledMat.color.copy(u.off).lerp(u.gold, state.awake[i] ? 1 : 0).multiplyScalar(state.awake[i] ? 3.2 : 1);
      if (!near) continue;
      const live = Math.round(8 + e * 46);
      u.bub.count = Math.min(live, u.list.length);
      for (let k = 0; k < u.bub.count; k++) {
        const b = u.list[k];
        b.y += b.v * state.dt * (0.3 + e * 1.5);
        if (b.y > LEVEL - b.r) seed(b, false, !!u.src.forming);
        const grow = 1 + (b.y + HALF) * 0.12;
        tmp.position.set(b.x + Math.sin(simT * 2.3 + b.ph) * 0.02, b.y, b.z + Math.cos(simT * 1.9 + b.ph) * 0.02);
        const wob = 1 + Math.sin(simT * 7 + b.ph) * 0.08;
        tmp.scale.set(b.r * grow * wob, b.r * grow / wob, b.r * grow * wob);
        tmp.updateMatrix(); u.bub.setMatrixAt(k, tmp.matrix);
      }
      u.bub.instanceMatrix.needsUpdate = true;
    }
    composer.render();
  }

  size();
  render({ dt: 0, rot: 0, energy: LP.chambers.map(() => 0.14), awake: [], near: LP.chambers.map(() => true) });
  ring.appendChild(cv);
  window.addEventListener("resize", size);
  LP.attach({ render, size });
}

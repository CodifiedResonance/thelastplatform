/* ═══════════════════════════════════════════════════════════════
   WORLD VAULT · CORE ENGINE
   Shared by: /world-vault/becoming, /filter, /mind
   Behavior differs by:
     body[data-veil]   → which veil this page is (becoming|filter|mind)
     body[data-access] → held | glimpsed
═══════════════════════════════════════════════════════════════ */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ─── Veil context ─────────────────────────────────────────────
const VEIL = document.body.dataset.veil || 'becoming';
const ACCESS = document.body.dataset.access || 'held';
const HAS_LIFE = VEIL === 'filter' || VEIL === 'mind';
const HAS_MIND = VEIL === 'mind';
const IS_HELD = ACCESS === 'held';

// ═══════════════════════════════════════════════════════════════
//  SHADERS
// ═══════════════════════════════════════════════════════════════

const NOISE_GLSL = `
vec3 mod289_3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289_4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289_4(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289_3(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float v=0.0;float a=0.5;
  for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.0;a*=0.5;}
  return v;
}
`;

const PLANET_VERT = `
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vPos=position;
  vNormal=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}
`;

const PLANET_FRAG = `
${NOISE_GLSL}
uniform float uTemp;
uniform float uWater;
uniform float uTime;
uniform float uAtmos;
uniform float uTectonic;
uniform float uAge;
uniform float uLifePresence;
uniform float uPostStellar;
uniform float uIntelligence;
uniform float uIntelStage;
uniform vec3 uLight0;
uniform vec3 uLight1;
uniform vec3 uLight2;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform int uLightN;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;

float hash(vec3 p){
  p=fract(p*vec3(443.897,441.423,437.195));
  p+=dot(p,p.yzx+19.19);
  return fract((p.x+p.y)*p.z);
}

void main(){
  vec3 p=normalize(vPos);
  float drift=uTectonic*log(1.0+uAge*0.0000001)*0.25;
  vec3 np=p+vec3(sin(drift)*drift*0.3,0.0,cos(drift)*drift*0.3);
  float continents=fbm(np*1.6);
  float detail=fbm(np*7.0)*0.28;
  float elev=continents+detail;
  float lat=abs(p.y);
  float waterLine=mix(1.4,-1.4,uWater);
  bool isWater=elev<waterLine;

  vec3 oceanShallow=vec3(0.08,0.28,0.42);
  vec3 oceanDeep=vec3(0.012,0.04,0.12);
  vec3 oceanFrozen=vec3(0.72,0.78,0.84);
  vec3 oceanHot=vec3(0.25,0.12,0.08);

  vec3 color;
  if(isWater){
    if(uTemp>140.0){
      color=mix(oceanHot,vec3(0.35,0.15,0.05),smoothstep(waterLine-1.0,waterLine,elev));
    } else if(uTemp<-5.0){
      color=oceanFrozen;
    } else {
      float depth=clamp((waterLine-elev)/1.5,0.0,1.0);
      color=mix(oceanShallow,oceanDeep,depth);
      if(uTemp>2.0 && uTemp<32.0 && uAtmos>0.3){
        float bio=fbm(np*8.0+uTime*0.00002);
        color=mix(color,vec3(0.06,0.32,0.26),smoothstep(0.2,0.5,bio)*0.22*uLifePresence);
      }
    }
  } else {
    float lh=clamp((elev-waterLine)/1.2,0.0,1.0);
    if(uTemp>110.0){
      color=mix(vec3(0.32,0.12,0.06),vec3(0.16,0.08,0.06),lh);
    } else if(uTemp>55.0){
      color=mix(vec3(0.78,0.55,0.3),vec3(0.55,0.4,0.25),lh);
    } else if(uTemp<-25.0){
      color=mix(vec3(0.82,0.86,0.92),vec3(0.6,0.65,0.75),lh);
    } else {
      vec3 lo=vec3(0.28,0.4,0.2);
      vec3 md=vec3(0.42,0.36,0.22);
      vec3 hi=vec3(0.55,0.5,0.42);
      lo=mix(vec3(0.4,0.35,0.28), lo, uLifePresence);
      color=mix(lo,md,smoothstep(0.0,0.5,lh));
      color=mix(color,hi,smoothstep(0.5,1.0,lh));
    }
  }

  float iceTemp=smoothstep(8.0,-15.0,uTemp);
  float iceLine=mix(1.1,0.28,iceTemp);
  float iceNoise=fbm(np*5.0)*0.04;
  float ice=smoothstep(iceLine-0.08,iceLine+0.02,lat+iceNoise);
  color=mix(color,vec3(0.93,0.96,1.0),ice);

  float vulc=fbm(np*3.0+uTime*0.00005)*uTectonic;
  if(!isWater && vulc>0.55){
    float lava=(vulc-0.55)*2.0;
    color=mix(color,vec3(0.9,0.4,0.12),clamp(lava,0.0,0.7));
  }

  if(uPostStellar>0.0){
    color=mix(color, color*vec3(0.5,0.55,0.7)*0.4, uPostStellar);
  }

  vec3 lit=vec3(0.0);
  float d0=max(0.0,dot(vNormal,uLight0));
  lit+=color*uColor0*d0;
  if(uLightN>=2){
    float d1=max(0.0,dot(vNormal,uLight1));
    lit+=color*uColor1*d1*0.75;
  }
  if(uLightN>=3){
    float d2=max(0.0,dot(vNormal,uLight2));
    lit+=color*uColor2*d2*0.55;
  }

  float ambient=0.025+0.055*uAtmos;
  vec3 finalColor=lit+color*ambient;

  if(isWater && uTemp>-5.0 && uTemp<140.0){
    vec3 H=normalize(uLight0+vView);
    float spec=pow(max(0.0,dot(vNormal,H)),48.0);
    finalColor+=vec3(0.5,0.7,0.9)*spec*0.5;
  }

  float nightness=1.0-max(0.0,dot(vNormal,uLight0));

  if(!isWater && nightness>0.55 && uIntelligence>0.01 && uIntelStage>=2.0){
    float density = smoothstep(2.0, 4.0, uIntelStage);
    float cellScale = mix(45.0, 70.0, density);
    vec3 cell = floor(np * cellScale);
    float h = hash(cell);
    float threshold = mix(0.985, 0.92, density);
    if (h > threshold) {
      float zoneGood = smoothstep(0.7, 0.3, lat) * smoothstep(waterLine-0.4, waterLine, elev);
      float lightMag = (h - threshold) / (1.0 - threshold);
      vec3 cityColor = mix(vec3(1.0, 0.85, 0.55), vec3(0.7, 0.85, 1.0), smoothstep(3.0, 4.0, uIntelStage));
      finalColor += cityColor * lightMag * zoneGood * uIntelligence * smoothstep(0.55, 0.9, nightness) * 1.2;
    }
  }

  if(nightness>0.55){
    float aurora=smoothstep(0.6,0.78,lat)*(1.0-smoothstep(0.88,0.96,lat));
    finalColor+=vec3(0.12,0.38,0.52)*aurora*uAtmos*0.9*smoothstep(0.55,0.95,nightness);
  }

  gl_FragColor=vec4(finalColor,1.0);
}
`;

const ATMO_VERT = `
varying vec3 vNormal;
varying vec3 vPos;
void main(){
  vNormal=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vPos=mv.xyz;
  gl_Position=projectionMatrix*mv;
}
`;

const ATMO_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec3 uLight;
void main(){
  vec3 viewDir=normalize(-vPos);
  float rim=1.0-abs(dot(vNormal,viewDir));
  rim=pow(rim,2.2);
  float lightF=0.3+0.7*max(0.0,dot(vNormal,uLight));
  gl_FragColor=vec4(uColor*rim*uIntensity*lightF,rim*uIntensity*0.95);
}
`;

const CLOUD_FRAG = `
${NOISE_GLSL}
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
uniform float uTime;
uniform float uWind;
uniform float uCoverage;
uniform float uAtmos;
uniform vec3 uLight0;
uniform vec3 uLight1;
uniform vec3 uLight2;
uniform int uLightN;
void main(){
  vec3 p=normalize(vPos);
  float t=uTime*(0.00006*uWind+0.000005);
  float n=fbm(p*2.6+vec3(t,t*0.7,t*0.3));
  float n2=fbm(p*5.5+vec3(-t*0.5,t*0.3,t*0.6))*0.35;
  float clouds=smoothstep(0.38-uCoverage*0.45,0.58,n+n2);
  clouds*=clamp(uAtmos*0.9,0.0,1.2);
  float light=max(0.0,dot(vNormal,uLight0));
  if(uLightN>=2) light=max(light,max(0.0,dot(vNormal,uLight1))*0.8);
  if(uLightN>=3) light=max(light,max(0.0,dot(vNormal,uLight2))*0.6);
  light=clamp(light+0.12,0.18,1.0);
  gl_FragColor=vec4(vec3(1.0,0.98,0.96)*light,clouds*0.7);
}
`;

const SUN_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
uniform vec3 uColor;
uniform float uTime;
uniform float uSwell;
void main(){
  vec3 viewDir=normalize(-vPos);
  float rim=pow(1.0-abs(dot(vNormal,viewDir)),1.4);
  float pulse=0.92+0.08*sin(uTime*0.0008);
  float turbulence=0.9+0.1*sin(uTime*0.002)*uSwell;
  vec3 core=uColor*2.2*pulse*turbulence;
  vec3 edge=uColor*(1.0+rim*2.5);
  gl_FragColor=vec4(mix(core,edge,rim),1.0);
}
`;

// ═══════════════════════════════════════════════════════════════
//  STATE, PRESETS, STELLAR CLASSES
// ═══════════════════════════════════════════════════════════════

const DEFAULTS = {
  distanceToStar: 1.0, atmosphereDensity: 1.0, greenhouse: 0.04,
  albedo: 0.3, waterCoverage: 0.71, gravity: 1.0, magneticField: 1.0,
  starCount: 1, moonCount: 1, tectonicActivity: 0.5, windSpeed: 1.0,
  cloudCoverage: 0.5, axialTilt: 23.5, rotationSpeed: 1.0,
  nearbyWorldCount: 2, timeScale: 0,
  stellarClass: 'G', radiationLevel: 0.3,
  atmosphereComposition: 'oxidizing', surfacePressure: 1.0,
  starBaseLuminosity: 1.0,
};

const STELLAR_CLASSES = {
  O: { life: 5e6,   luminosity: 30000, color: [0.6, 0.7, 1.0],  temp: 40000, habitableDist: 170 },
  B: { life: 8e7,   luminosity: 500,   color: [0.7, 0.8, 1.0],  temp: 20000, habitableDist: 22 },
  A: { life: 1e9,   luminosity: 25,    color: [0.85, 0.9, 1.0], temp: 8500,  habitableDist: 5 },
  F: { life: 4e9,   luminosity: 4,     color: [1.0, 0.96, 0.9], temp: 6500,  habitableDist: 2 },
  G: { life: 1e10,  luminosity: 1,     color: [1.0, 0.96, 0.86],temp: 5700,  habitableDist: 1 },
  K: { life: 5e10,  luminosity: 0.25,  color: [1.0, 0.82, 0.6], temp: 4500,  habitableDist: 0.5 },
  M: { life: 2e12,  luminosity: 0.05,  color: [1.0, 0.65, 0.4], temp: 3200,  habitableDist: 0.2 },
};

const PRESETS = {
  Terra:     { ...DEFAULTS },
  Glacia:    { ...DEFAULTS, distanceToStar: 1.9, atmosphereDensity: 0.6, greenhouse: 0.01, albedo: 0.78, waterCoverage: 0.92, moonCount: 2, tectonicActivity: 0.2, windSpeed: 1.8, cloudCoverage: 0.3, axialTilt: 12 },
  "Vault-1": { ...DEFAULTS, distanceToStar: 0.92, atmosphereDensity: 1.3, greenhouse: 0.06, albedo: 0.18, waterCoverage: 1.0, gravity: 1.1, magneticField: 1.2, tectonicActivity: 0.1, windSpeed: 1.8, cloudCoverage: 0.7, axialTilt: 6, rotationSpeed: 0.7, nearbyWorldCount: 0 },
  Cindros:   { ...DEFAULTS, distanceToStar: 0.52, atmosphereDensity: 0.3, greenhouse: 0.22, albedo: 0.13, waterCoverage: 0.0, gravity: 0.8, magneticField: 0.2, moonCount: 0, tectonicActivity: 0.85, windSpeed: 3.0, cloudCoverage: 0.08, axialTilt: 42, rotationSpeed: 2.0, nearbyWorldCount: 1, stellarClass: 'K', radiationLevel: 0.7, atmosphereComposition: 'thick-co2' },
  Whisper:   { ...DEFAULTS, distanceToStar: 2.6, atmosphereDensity: 0.08, greenhouse: 0.005, albedo: 0.42, waterCoverage: 0.04, gravity: 0.4, magneticField: 0.08, moonCount: 0, tectonicActivity: 0.04, windSpeed: 0.2, cloudCoverage: 0.03, axialTilt: 4, rotationSpeed: 0.3, nearbyWorldCount: 3, stellarClass: 'M', radiationLevel: 0.2 },
  "M-Dwarf Eye": { ...DEFAULTS, distanceToStar: 0.18, atmosphereDensity: 1.1, waterCoverage: 0.55, greenhouse: 0.05, stellarClass: 'M', radiationLevel: 0.85, rotationSpeed: 0.1, axialTilt: 2 },
  "Binary Waltz": { ...DEFAULTS, distanceToStar: 1.3, atmosphereDensity: 1.15, greenhouse: 0.05, albedo: 0.28, waterCoverage: 0.55, starCount: 2, tectonicActivity: 0.65, windSpeed: 2.2, cloudCoverage: 0.45, axialTilt: 20, rotationSpeed: 1.4 },
  "Three Suns":   { ...DEFAULTS, distanceToStar: 1.8, atmosphereDensity: 1.0, greenhouse: 0.03, albedo: 0.32, waterCoverage: 0.45, starCount: 3, tectonicActivity: 0.55, windSpeed: 2.5, cloudCoverage: 0.5, axialTilt: 28, rotationSpeed: 1.0, moonCount: 2 },
};

const STAR_COLORS = [
  [1.0, 0.96, 0.86],
  [0.82, 0.9, 1.0],
  [1.0, 0.72, 0.5],
];

const state = { ...DEFAULTS };
let age = 0;
let activeTab = "system";
let intelligenceSeed = null;
let intelligencePhase = 0;
let intelligenceEnded = null;

// ═══════════════════════════════════════════════════════════════
//  PHYSICS & LIFE FILTER (unchanged from Phase III)
// ═══════════════════════════════════════════════════════════════

function stellarState(stellarClass, age) {
  const s = STELLAR_CLASSES[stellarClass];
  const life = s.life;
  const t = age / life;
  let epoch, lumScale, colorShift, sizeScale, swell;
  const highMass = ['O', 'B', 'A'].includes(stellarClass);
  if (t < 0.5) { epoch='young'; lumScale=0.7+t*0.6; colorShift=0; sizeScale=1.0; swell=0; }
  else if (t < 0.95) { epoch='main'; lumScale=1.0+(t-0.5)*0.4; colorShift=0; sizeScale=1.0+(t-0.5)*0.1; swell=0; }
  else if (t < 1.0) { epoch='subgiant'; const u=(t-0.95)/0.05; lumScale=1.18+u*2.0; colorShift=u*0.4; sizeScale=1.0+u*1.5; swell=u*0.5; }
  else if (t < 1.08) { epoch='red-giant'; const u=(t-1.0)/0.08; lumScale=3.2+u*15; colorShift=0.4+u*0.4; sizeScale=2.5+u*4; swell=0.5+u*0.5; }
  else if (t < 1.10) { epoch=highMass?'supernova':'shedding'; const u=(t-1.08)/0.02; lumScale=18*(1-u)+0.001; colorShift=0.8; sizeScale=6.5-u*6.3; swell=1.0; }
  else {
    if (highMass) { epoch='corpse'; lumScale=0; colorShift=0; sizeScale=0.01; swell=0; }
    else { epoch='ember'; const u=Math.min((t-1.10)*2,1); lumScale=0.01*(1-u*0.99); colorShift=-0.6; sizeScale=0.08; swell=0; }
  }
  return { epoch, lumScale, colorShift, sizeScale, swell, highMass };
}

function effectiveLuminosity(c, stellar) {
  return stellar.lumScale * (c.starCount >= 2 ? (1 + (c.starCount - 1) * 0.8) : 1);
}

function computeTemperature(c) {
  const stellar = stellarState(c.stellarClass, age);
  const lum = effectiveLuminosity(c, stellar);
  const classFactor = STELLAR_CLASSES[c.stellarClass].luminosity;
  const solarFlux = (classFactor * lum) / (c.distanceToStar * c.distanceToStar);
  const absorbed = solarFlux * (1 - c.albedo);
  const baseK = 278 * Math.pow(Math.max(absorbed, 0.001), 0.25);
  const greenhouse = c.greenhouse * 260 * Math.min(c.atmosphereDensity, 5);
  const magProtection = c.magneticField < 0.2 ? -8 : 0;
  return baseK + greenhouse + magProtection - 273.15;
}

function computeHabitability(c, T) {
  const tempScore = Math.max(0, 1 - Math.abs(T - 15) / 45);
  const atmoScore = c.atmosphereDensity > 0.3 && c.atmosphereDensity < 2.5 ? 1 - Math.abs(c.atmosphereDensity - 1) / 1.5 : 0;
  const waterScore = c.waterCoverage > 0.1 && c.waterCoverage < 0.95 ? 1 : 0.2;
  const gravScore = c.gravity > 0.4 && c.gravity < 1.8 ? 1 - Math.abs(c.gravity - 1) / 1.2 : 0.1;
  const magScore = c.magneticField > 0.25 ? 1 : 0.3;
  const radScore = c.radiationLevel < 0.6 ? 1 : Math.max(0, 1 - (c.radiationLevel - 0.6) * 3);
  const atmoChem = c.atmosphereComposition === 'oxidizing' ? 1 : c.atmosphereComposition === 'reducing' ? 0.7 : 0.2;
  return Math.max(0, Math.min(1, (tempScore + atmoScore + waterScore + gravScore + magScore + radScore + atmoChem) / 7));
}

function computeLifePresence(c, T, stellar) {
  if (['shedding', 'corpse', 'supernova', 'ember'].includes(stellar.epoch)) return 0;
  const hab = computeHabitability(c, T);
  if (hab < 0.2) return 0;
  if (age < 1e8) return 0;
  const maturity = Math.min(1, (age - 1e8) / 5e8);
  return hab * maturity;
}

function possibilityLayer(c, T, stellar, lifePresence) {
  const tags = [];
  if (lifePresence < 0.05) {
    if (age < 1e8) return [{ k: 'pre-biotic chemistry', cls: 'possible' }];
    if (['shedding', 'corpse', 'supernova'].includes(stellar.epoch)) return [{ k: 'life extinguished', cls: 'possible' }];
    return [{ k: 'no emergence', cls: 'possible' }];
  }
  if (c.waterCoverage > 0.95) tags.push({ k: 'aquatic only', cls: 'dominant' });
  else if (c.waterCoverage < 0.1 && c.atmosphereDensity > 0.3) tags.push({ k: 'subterranean', cls: 'dominant' });
  else if (T < -15) tags.push({ k: 'ice-adapted', cls: 'dominant' });
  else if (T > 70) tags.push({ k: 'extremophile only', cls: 'dominant' });
  else if (c.atmosphereDensity < 0.25) tags.push({ k: 'microbial only', cls: 'dominant' });
  if (c.waterCoverage > 0.1 && c.waterCoverage < 0.95 && T > -5 && T < 50) tags.push({ k: 'aquatic', cls: 'possible' });
  if (c.waterCoverage < 0.85 && T > -20 && T < 55 && c.atmosphereDensity > 0.3) tags.push({ k: 'terrestrial', cls: 'possible' });
  if (c.atmosphereDensity > 1.5 && c.gravity < 1.5) tags.push({ k: 'aerial-biased', cls: 'possible' });
  if (c.atmosphereDensity > 2.5) tags.push({ k: 'high-pressure', cls: 'possible' });
  if (c.gravity > 1.8) tags.push({ k: 'low-slung forms', cls: 'possible' });
  if (c.gravity < 0.5) tags.push({ k: 'giant forms possible', cls: 'possible' });
  else if (c.gravity > 2.2) tags.push({ k: 'giants impossible', cls: 'possible' });
  if (c.radiationLevel > 0.5) tags.push({ k: 'radiation-hardened', cls: 'possible' });
  if (STELLAR_CLASSES[c.stellarClass].luminosity < 0.3) tags.push({ k: 'low-light photosynth', cls: 'possible' });
  if (c.atmosphereComposition === 'reducing') tags.push({ k: 'chemosynthetic', cls: 'possible' });
  if (c.atmosphereComposition === 'toxic') tags.push({ k: 'sulfur-based possible', cls: 'possible' });
  return tags.length ? tags : [{ k: 'marginal', cls: 'possible' }];
}

function pressureLayer(c, T, stellar, lifePresence) {
  if (lifePresence < 0.05) return [];
  const tags = [];
  const strong = (k) => tags.push({ k, cls: 'strong-pressure' });
  const norm = (k) => tags.push({ k, cls: 'pressure' });
  if (c.tectonicActivity > 0.7) strong('burrowing'); else if (c.tectonicActivity > 0.4) norm('burrowing');
  if (c.radiationLevel > 0.5 || STELLAR_CLASSES[c.stellarClass].luminosity < 0.3) strong('nocturnal adaptation');
  else if (c.radiationLevel > 0.3) norm('nocturnal adaptation');
  if (T < 0) strong('insulation'); else if (T < 10) norm('insulation');
  if (T > 40) strong('heat dissipation');
  if (c.windSpeed > 2.5) strong('wind-anchoring'); else if (c.windSpeed > 1.5 && c.atmosphereDensity > 0.8) norm('gliding over flight');
  if (c.waterCoverage > 0.8) strong('reef-like intelligence'); else if (c.waterCoverage > 0.6) norm('reef-like intelligence');
  if (c.waterCoverage < 0.3 && T > 10 && T < 35) norm('fungal planetary networks');
  if (c.moonCount >= 2) norm('tidal rhythm life');
  if (STELLAR_CLASSES[c.stellarClass].luminosity < 0.2) strong('photosynthesis alternatives');
  if (c.gravity > 1.4) strong('shell structures'); else if (c.gravity > 1.1) norm('shell structures');
  if (c.gravity < 0.5) norm('speed & float');
  if (c.atmosphereDensity < 0.4) strong('camouflage'); else norm('camouflage');
  if (c.starCount >= 2) norm('dual-rhythm metabolism');
  if (c.stellarClass === 'M') norm('tidal-locked gradients');
  if (c.magneticField < 0.3) strong('distributed nervous systems');
  if (c.tectonicActivity < 0.15) norm('collective intelligence');
  return tags;
}

function collapseLayer(c, T, stellar, lifePresence) {
  const tags = [];
  const imm = (k) => tags.push({ k, cls: 'imminent' });
  const norm = (k) => tags.push({ k, cls: 'collapse' });
  if (stellar.epoch === 'subgiant') imm('stellar brightening');
  if (stellar.epoch === 'red-giant') imm('engulfment looming');
  if (stellar.epoch === 'shedding') imm('stellar dissolution');
  if (stellar.epoch === 'supernova') imm('supernova sterilization');
  if (c.starCount >= 2) norm('orbital instability');
  if (c.moonCount >= 3) norm('tidal catastrophe');
  if (c.axialTilt > 45) norm('seasonal extremism');
  if (T > 60) imm('runaway greenhouse');
  if (T < -40) norm('deep freeze lock-in');
  if (c.waterCoverage < 0.1 && c.tectonicActivity < 0.2) norm('dry cycles');
  if (c.waterCoverage > 0.1 && T > 0 && T < 30 && c.axialTilt > 30) norm('freeze/thaw cycles');
  if (c.tectonicActivity > 0.8) norm('volcanic resets');
  if (c.radiationLevel > 0.7) imm('radiation storms'); else if (c.radiationLevel > 0.5) norm('radiation storms');
  if (c.magneticField < 0.2 && age > 1e8) norm('atmospheric stripping');
  if (c.greenhouse > 0.15) norm('toxic atmosphere drift');
  if (c.atmosphereComposition === 'toxic') norm('chemical stagnation');
  if (c.atmosphereDensity < 0.2) norm('oxygen collapse');
  if (lifePresence > 0.7 && c.tectonicActivity > 0.6 && age > 5e8) norm('predator imbalance');
  return tags;
}

// ═══════════════════════════════════════════════════════════════
//  INTELLIGENCE (only computed if HAS_MIND)
// ═══════════════════════════════════════════════════════════════

function intelligencePotential(c, T, stellar) {
  const life = computeLifePresence(c, T, stellar);
  if (life < 0.65) return 0;
  if (age < 1.5e9) return 0;
  if (['subgiant', 'red-giant', 'shedding', 'supernova', 'ember', 'corpse'].includes(stellar.epoch)) return 0;
  let score = 0;
  if (c.tectonicActivity > 0.15 && c.tectonicActivity < 0.75) score += 0.15;
  if (c.axialTilt > 8 && c.axialTilt < 45) score += 0.1;
  if (c.atmosphereDensity > 0.3) score += 0.15;
  if (c.waterCoverage > 0.3 && c.waterCoverage < 0.95) score += 0.1;
  if (c.magneticField > 0.3) score += 0.1;
  if (c.radiationLevel < 0.6) score += 0.1;
  score += life * 0.2;
  if (computeHabitability(c, T) > 0.35) score += 0.1;
  return Math.max(0, Math.min(1, score));
}

function deriveIntelligenceSeed(c, T) {
  let substrate, form, aesthetic;
  if (c.waterCoverage > 0.9) {
    substrate = 'aquatic';
    form = c.gravity > 1.3 ? 'pressure-dwelling schools' : c.tectonicActivity > 0.5 ? 'hydrothermal colonists' : 'pelagic singers';
    aesthetic = 'currents, song, long consensus';
  } else if (c.waterCoverage < 0.15) {
    substrate = 'dryland';
    form = c.tectonicActivity < 0.3 ? 'fungal cognition-mats' : c.radiationLevel > 0.5 ? 'burrowing archivists' : 'migratory herds';
    aesthetic = 'endurance, patience, long roads';
  } else if (c.atmosphereDensity > 2.0 && c.gravity < 1.2) {
    substrate = 'aerial';
    form = c.windSpeed > 2 ? 'wind-locked flocks' : 'drifting thinkers';
    aesthetic = 'currents of air, perpetual motion';
  } else if (c.atmosphereDensity < 0.35) {
    substrate = 'subterranean'; form = 'cavern networks';
    aesthetic = 'stone, silence, cartography';
  } else if (c.stellarClass === 'M') {
    substrate = 'terminator'; form = 'twilight-walkers';
    aesthetic = 'edge of day, edge of night, never middle';
  } else {
    substrate = 'mixed-terrain';
    form = c.gravity > 1.4 ? 'low-built builders' : c.gravity < 0.6 ? 'tall reaching forms' : c.atmosphereDensity > 1.5 ? 'amphibious tool-users' : 'bipedal generalists';
    aesthetic = 'hands, fire, language';
  }
  let cognition = [];
  if (c.tectonicActivity < 0.2) cognition.push('patient');
  if (c.tectonicActivity > 0.6) cognition.push('reactive');
  if (c.radiationLevel > 0.5 || STELLAR_CLASSES[c.stellarClass].luminosity < 0.3) cognition.push('introspective');
  if (c.waterCoverage > 0.7) cognition.push('distributed');
  if (c.magneticField < 0.3) cognition.push('decentralized');
  if (c.atmosphereDensity > 2 || c.atmosphereDensity < 0.4) cognition.push('chemically-attuned');
  if (c.moonCount >= 2) cognition.push('rhythm-bound');
  if (c.starCount >= 2) cognition.push('dual-natured');
  if (cognition.length === 0) cognition.push('exploratory');
  return { bornAt: age, substrate, form, aesthetic, cognition, stellarClass: c.stellarClass };
}

function intelligenceStage(seed, ageNow, potential, c, T, stellar) {
  if (!seed) return 0;
  const elapsed = ageNow - seed.bornAt;
  const hab = computeHabitability(c, T);
  const stellarDying = ['subgiant', 'red-giant', 'shedding', 'supernova'].includes(stellar.epoch);
  if (stellarDying) return 6;
  if (hab < 0.15 || potential < 0.15) return 6;
  const speed = Math.max(0.3, potential);
  const scale = 1 / speed;
  if (elapsed < 2e6 * scale) return 1;
  if (elapsed < 2e7 * scale) return 2;
  if (elapsed < 5e7 * scale) return 3;
  if (elapsed < 2e8 * scale) return 4;
  return 5;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function stageDescription(stage, seed) {
  const { substrate, form, aesthetic, cognition } = seed;
  const cog = cognition.slice(0, 3).join(', ');
  const T = {
    1: { title: 'Stirring', desc: `Something begins to keep track. ${capitalize(form)} develop pattern-recognition beyond reflex — they remember which tide, which predator, which neighbour. The substrate is ${substrate}; the style is ${cog}.` },
    2: { title: 'Settlement', desc: `Shelters, rituals, the first inheritances that aren't genetic. They mark places as theirs. On this world the mark looks like ${aesthetic}.` },
    3: { title: 'Industry', desc: `They learn to concentrate energy — fire or its analog, metal or its analog, writing or its analog. The atmosphere begins to register them faintly. This is the loudest phase and the shortest.` },
    4: { title: 'Network', desc: `The planet becomes one conversation. Individuals fade slightly; collectives thicken. The cognition settles into ${cog}. On the night side, lights.` },
    5: { title: 'After', desc: `Industry has quieted. Something remains — maybe the same minds refined, maybe their successors, maybe only what they left. The planet holds it. The universe mostly doesn't notice.` },
    6: { title: 'Silence', desc: `The intelligence is no longer active. The world keeps its shape a little longer.` },
  };
  return T[stage] || T[1];
}

function fermiAssessment(c, T, stellar, potential, seed, stage) {
  if (potential === 0 && !seed) {
    if (age < 1e8) return { tone: 'neutral', text: 'The world has not yet had time.' };
    if (computeLifePresence(c, T, stellar) < 0.1) return { tone: 'neutral', text: 'The biosphere never took root deeply enough.' };
    if (age < 1.5e9) return { tone: 'neutral', text: 'Life here is real, but young. Give it time.' };
    return { tone: '', text: 'Conditions here do not reward the particular assembly minds require.' };
  }
  if (seed && stage >= 6) return { tone: '', text: `What lived, lived. What it made is now folded into the rock. Cause: ${intelligenceEnded?.cause || 'unknown'}.` };
  if (seed && stage === 5) return { tone: 'hope', text: `They passed through the loud phase without breaking. This is rarer than the physics alone would predict.` };
  if (seed && stage === 4) return { tone: '', text: `The noisy moment. Detectable — for a while, in certain directions. Windows like this tend to be narrow.` };
  if (seed && stage === 3) return { tone: '', text: `The critical choke. Most worlds that reach here do not reach further; the reasons are many and monotonous.` };
  if (seed) return { tone: 'hope', text: `Intelligence is present but still small. What it becomes is not fixed.` };
  if (potential > 0.5) return { tone: 'hope', text: `Conditions are favorable. Something may stir here soon, on this world's terms.` };
  return { tone: 'neutral', text: 'The filter is open, but quiet.' };
}

function diagnoseEnd(c, T, stellar, prevStage) {
  if (['subgiant', 'red-giant'].includes(stellar.epoch)) return 'stellar brightening';
  if (['shedding', 'supernova'].includes(stellar.epoch)) return 'stellar death';
  if (T > 60) return 'runaway greenhouse';
  if (T < -40) return 'deep freeze';
  if (c.atmosphereDensity < 0.2) return 'atmospheric collapse';
  if (c.radiationLevel > 0.8) return 'radiation scouring';
  if (computeHabitability(c, T) < 0.15) return 'habitability loss';
  if (prevStage >= 3 && prevStage <= 4) return 'self-induced (inferred)';
  return 'unknown';
}

function oracleMessage(c, T, age, stellar, lifePresence, seed, stage) {
  if (stellar.epoch === 'subgiant') return { text: "The star is beginning to remember its end.", intel: false };
  if (stellar.epoch === 'red-giant') return { text: "A red light, terrible and close, fills the sky.", intel: false };
  if (stellar.epoch === 'shedding') return { text: "The star loosens its edges. The world flinches.", intel: false };
  if (stellar.epoch === 'supernova') return { text: "Light that should not exist. A final noon.", intel: false };
  if (stellar.epoch === 'corpse') return { text: "Only gravity remains, and what orbits it.", intel: false };
  if (stellar.epoch === 'ember') return { text: "A small blue coal in the dark. The world persists beside it.", intel: false };
  if (HAS_MIND && seed && stage > 0 && stage < 6) {
    const intelMsgs = {
      1: ["Something small is starting to notice.", `The first ${seed.form.split(' ').pop()} keep time. Badly. But they keep it.`, "A mind has begun to fold back on itself."],
      2: ["They are building. Not much. But the word 'building' now applies here.", `The ${seed.aesthetic.split(',')[0]} are becoming a signature.`, "Rituals. The first inheritances that aren't written in cells."],
      3: ["The noisy phase. Smoke, or its local equivalent.", "They concentrate energy. The atmosphere registers them faintly.", "This is the choke. Most do not pass it. Some do."],
      4: ["The planet has become a single slow conversation.", "On the night side: lights. A signature visible for a while.", `The cognition has settled into the world's grain: ${seed.cognition.slice(0,2).join(', ')}.`],
      5: ["They passed through. The loud phase has ended and they continue.", "What remains is quieter than what was, and stranger.", "The world carries them now, lightly."],
    };
    const pool = intelMsgs[stage] || [];
    if (pool.length) return { text: pool[Math.floor((age / 4000) % pool.length)], intel: true };
  }
  if (HAS_MIND && seed && stage === 6) return { text: "The lights are out. The world keeps turning.", intel: true };
  const m = [];
  if (T < -60) m.push("Crystalline silence. The atmosphere holds its breath.");
  else if (T < -25) m.push("A long winter without end.");
  else if (T > 200) m.push("Stones burn where stones should hold.");
  else if (T > 90) m.push("Shadows are the only cool things here.");
  if (c.waterCoverage > 0.97) m.push("An ocean without shore.");
  else if (c.waterCoverage < 0.02) m.push("Dust takes the place of water.");
  if (c.atmosphereDensity < 0.15) m.push("The sky has mostly left.");
  else if (c.atmosphereDensity > 3.5) m.push("The air lies thick as water.");
  if (c.gravity > 2.5) m.push("Things do not fall. They settle.");
  else if (c.gravity < 0.3) m.push("Stones drift. Rain takes its time.");
  if (c.magneticField < 0.15 && age > 1e6) m.push("Without a field, the air is slowly combed away.");
  if (c.starCount === 2) m.push("Two suns trade guardianship of the day.");
  else if (c.starCount === 3) m.push("Three companions. Shadows keep their own time.");
  if (c.tectonicActivity > 0.85) m.push("The ground is never still.");
  if (c.stellarClass === 'M') m.push("A small red sun. A patient kind of day.");
  if (HAS_LIFE && lifePresence > 0.6 && age < 1e9) m.push("Something small is keeping time now.");
  else if (HAS_LIFE && lifePresence > 0.7) m.push("The biosphere has learned how to remember itself.");
  if (T >= 4 && T <= 26 && c.waterCoverage > 0.25 && c.waterCoverage < 0.88 &&
      c.atmosphereDensity > 0.5 && c.atmosphereDensity < 1.8 &&
      c.gravity > 0.6 && c.gravity < 1.5 && c.magneticField > 0.35) {
    m.push("The conditions, in stillness, suggest welcome.");
  }
  if (!m.length) return { text: '', intel: false };
  return { text: m[Math.floor((age / 2500) % m.length)], intel: false };
}

let lastEpoch = 'young';
function handleEpochTransition(newEpoch, highMass) {
  if (newEpoch === lastEpoch) return;
  lastEpoch = newEpoch;
  const msgs = {
    'young': null, 'main': null,
    'subgiant': 'The star begins to swell.',
    'red-giant': 'Red giant phase. Oceans boil.',
    'shedding': highMass ? null : 'The star sheds its skin.',
    'supernova': 'Supernova.',
    'corpse': highMass ? 'A corpse remains. Neutron or void.' : null,
    'ember': 'A white dwarf cools in the dark.',
  };
  const msg = msgs[newEpoch];
  if (msg) showEventBanner(msg, false);
}

let lastIntelStage = 0;
function handleIntelTransition(newStage, seed) {
  if (newStage === lastIntelStage) return;
  const prevStage = lastIntelStage;
  lastIntelStage = newStage;
  const events = {
    1: `A mind stirs. Substrate: ${seed.substrate}.`,
    2: `Settlement. ${capitalize(seed.form)}.`,
    3: `Industry. The atmosphere registers them.`,
    4: `The planet has become one conversation.`,
    5: `They passed through.`,
    6: prevStage >= 3 ? `The lights go out.` : `The stirring fades.`,
  };
  const msg = events[newStage];
  if (msg) showEventBanner(msg, true);
}

function showEventBanner(text, isIntel) {
  const existing = document.querySelector('.event-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.className = 'event-banner' + (isIntel ? ' intel' : '');
  const mark = isIntel ? 'INTELLIGENCE' : 'EVENT';
  banner.innerHTML = `<div class="event-mark">— ${mark} —</div><div class="event-text">${text}</div>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4500);
}

function epochBadgeClass(epoch) {
  if (['subgiant', 'red-giant'].includes(epoch)) return 'late';
  if (['shedding', 'supernova'].includes(epoch)) return 'end';
  if (['corpse', 'ember'].includes(epoch)) return 'post';
  return '';
}

function epochLabel(epoch) {
  return { 'young':'YOUNG','main':'MAIN SEQUENCE','subgiant':'SUBGIANT','red-giant':'RED GIANT','shedding':'SHEDDING','supernova':'SUPERNOVA','corpse':'CORPSE','ember':'WHITE DWARF' }[epoch] || epoch.toUpperCase();
}

function formatAge(yrs) {
  if (yrs < 1) return "0 yr";
  if (yrs < 1000) return `${Math.floor(yrs)} yr`;
  if (yrs < 1e6) return `${(yrs/1000).toFixed(2)} kyr`;
  if (yrs < 1e9) return `${(yrs/1e6).toFixed(2)} Myr`;
  return `${(yrs/1e9).toFixed(2)} Gyr`;
}

function formatTemp(T) {
  if (T > 10000 || T < -500) return "—";
  if (T > 1000) return `${T.toFixed(0)} °C`;
  return `${T > 0 ? "+" : ""}${T.toFixed(1)} °C`;
}

// ═══════════════════════════════════════════════════════════════
//  THREE.JS SCENE
// ═══════════════════════════════════════════════════════════════

const mount = document.getElementById('mount');
const w = () => mount.clientWidth;
const h = () => mount.clientHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(45, w()/h(), 0.1, 3000);
camera.position.set(0, 0.3, 4.2);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(w(), h());
mount.appendChild(renderer.domElement);

const starGeo = new THREE.BufferGeometry();
const starCount = 4000;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 500 + Math.random() * 400;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  starPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
  starPos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
  starPos[i*3+2] = r * Math.cos(ph);
  const shade = 0.5 + Math.random() * 0.5;
  const tint = Math.random();
  starCol[i*3]   = shade * (tint < 0.3 ? 0.85 : 1.0);
  starCol[i*3+1] = shade * 0.95;
  starCol[i*3+2] = shade * (tint > 0.7 ? 0.85 : 1.0);
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 1.8, vertexColors: true, sizeAttenuation: false,
  transparent: true, opacity: 0.9, depthWrite: false,
}));
scene.add(stars);

const planetGroup = new THREE.Group();
scene.add(planetGroup);

const planetUniforms = {
  uTemp: { value: 15 }, uWater: { value: 0.71 }, uTime: { value: 0 },
  uAtmos: { value: 1 }, uTectonic: { value: 0.5 }, uAge: { value: 0 },
  uLifePresence: { value: 0 }, uPostStellar: { value: 0 },
  uIntelligence: { value: 0 }, uIntelStage: { value: 0 },
  uLight0: { value: new THREE.Vector3(1, 0, 0.3) },
  uLight1: { value: new THREE.Vector3(-0.7, 0, 0.5) },
  uLight2: { value: new THREE.Vector3(0.2, 0.5, -0.8) },
  uColor0: { value: new THREE.Color(...STAR_COLORS[0]) },
  uColor1: { value: new THREE.Color(...STAR_COLORS[1]) },
  uColor2: { value: new THREE.Color(...STAR_COLORS[2]) },
  uLightN: { value: 1 },
};
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  new THREE.ShaderMaterial({ uniforms: planetUniforms, vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG })
);
planetGroup.add(planet);

const cloudUniforms = {
  uTime: { value: 0 }, uWind: { value: 1 }, uCoverage: { value: 0.5 }, uAtmos: { value: 1 },
  uLight0: planetUniforms.uLight0, uLight1: planetUniforms.uLight1,
  uLight2: planetUniforms.uLight2, uLightN: planetUniforms.uLightN,
};
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.012, 96, 96),
  new THREE.ShaderMaterial({
    uniforms: cloudUniforms, vertexShader: PLANET_VERT, fragmentShader: CLOUD_FRAG,
    transparent: true, depthWrite: false,
  })
);
planetGroup.add(clouds);

const atmoUniforms = {
  uIntensity: { value: 1 },
  uColor: { value: new THREE.Color(0.4, 0.65, 1.0) },
  uLight: planetUniforms.uLight0,
};
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.08, 64, 64),
  new THREE.ShaderMaterial({
    uniforms: atmoUniforms, vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    blending: THREE.AdditiveBlending, transparent: true, side: THREE.BackSide, depthWrite: false,
  })
);
scene.add(atmosphere);

const suns = [];
for (let i = 0; i < 3; i++) {
  const u = { uColor: { value: new THREE.Color(...STAR_COLORS[i]) }, uTime: { value: 0 }, uSwell: { value: 0 } };
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ATMO_VERT, fragmentShader: SUN_FRAG }));
  sun.visible = false;
  scene.add(sun);
  const haloU = { uIntensity:{value:1.5}, uColor:{value:new THREE.Color(...STAR_COLORS[i])}, uLight:{value:new THREE.Vector3(0,0,1)} };
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), new THREE.ShaderMaterial({ uniforms: haloU, vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, blending: THREE.AdditiveBlending, transparent: true, side: THREE.BackSide, depthWrite: false }));
  sun.add(halo);
  suns.push({ mesh: sun, uniforms: u, haloUniforms: haloU });
}

const moons = [];
for (let i = 0; i < 4; i++) {
  const size = 0.08 + Math.random() * 0.08;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.55 + Math.random() * 0.2, 0.5 + Math.random() * 0.15, 0.5 + Math.random() * 0.15),
    roughness: 0.95, metalness: 0,
  }));
  moon.visible = false;
  scene.add(moon);
  moons.push({ mesh: moon, radius: 1.8 + i * 0.6, speed: 0.4 - i * 0.08, tilt: (Math.random() - 0.5) * 0.6, phase: Math.random() * Math.PI * 2 });
}

const nearbys = [];
for (let i = 0; i < 4; i++) {
  const size = 0.12 + Math.random() * 0.15;
  const hue = Math.random() * 0.3 + 0.55;
  const world = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.3, 0.5), roughness: 0.85 }));
  world.visible = false;
  scene.add(world);
  nearbys.push({ mesh: world, radius: 12 + i * 4, speed: 0.08 - i * 0.015, phase: Math.random() * Math.PI * 2, tilt: (Math.random() - 0.5) * 0.5 });
}

scene.add(new THREE.AmbientLight(0x202030, 0.4));
const sunLights = STAR_COLORS.map(c => { const l = new THREE.PointLight(new THREE.Color(...c), 2, 100); l.visible = false; scene.add(l); return l; });

let drag = { active: false, x: 0, y: 0 };
let rotY = 0, rotX = 0.2, velY = 0.003;
const onDown = (e) => { drag.active = true; const pt = e.touches ? e.touches[0] : e; drag.x = pt.clientX; drag.y = pt.clientY; velY = 0; };
const onMove = (e) => {
  if (!drag.active) return;
  const pt = e.touches ? e.touches[0] : e;
  const dx = pt.clientX - drag.x;
  const dy = pt.clientY - drag.y;
  rotY += dx * 0.005;
  rotX += dy * 0.005;
  rotX = Math.max(-1.2, Math.min(1.2, rotX));
  velY = dx * 0.0005;
  drag.x = pt.clientX; drag.y = pt.clientY;
  if (e.touches) e.preventDefault();
};
const onUp = () => { drag.active = false; };
renderer.domElement.addEventListener("mousedown", onDown);
window.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);
renderer.domElement.addEventListener("touchstart", onDown, { passive: false });
renderer.domElement.addEventListener("touchmove", onMove, { passive: false });
renderer.domElement.addEventListener("touchend", onUp);

window.addEventListener("resize", () => {
  camera.aspect = w() / h();
  camera.updateProjectionMatrix();
  renderer.setSize(w(), h());
});

function primaryStarColor(stellarClass, colorShift) {
  const base = STELLAR_CLASSES[stellarClass].color;
  const c = new THREE.Color(...base);
  if (colorShift > 0) {
    c.r = Math.min(1, c.r + colorShift * 0.3);
    c.g = Math.max(0.2, c.g - colorShift * 0.3);
    c.b = Math.max(0.1, c.b - colorShift * 0.5);
  } else if (colorShift < 0) {
    c.r = Math.max(0.6, c.r + colorShift * 0.3);
    c.g = Math.max(0.7, c.g + colorShift * 0.2);
    c.b = Math.min(1.0, c.b - colorShift * 0.4);
  }
  return c;
}

let last = performance.now();
let clockT = 0;

function loop() {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  clockT += dt * 1000;

  const c = state;
  // Time only flows if held
  if (IS_HELD) age += c.timeScale * dt;

  const stellar = stellarState(c.stellarClass, age);
  handleEpochTransition(stellar.epoch, stellar.highMass);
  const temp = computeTemperature(c);
  const lifePresence = HAS_LIFE ? computeLifePresence(c, temp, stellar) : 0;
  const potential = HAS_MIND ? intelligencePotential(c, temp, stellar) : 0;

  if (HAS_MIND && !intelligenceSeed && potential > 0.5 && !intelligenceEnded) {
    intelligenceSeed = deriveIntelligenceSeed(c, temp);
  }
  let currentStage = 0;
  if (HAS_MIND && intelligenceSeed) {
    currentStage = intelligenceStage(intelligenceSeed, age, potential, c, temp, stellar);
    if (currentStage === 6 && !intelligenceEnded) {
      intelligenceEnded = { endedAt: age, cause: diagnoseEnd(c, temp, stellar, intelligencePhase) };
    }
    intelligencePhase = currentStage;
  }
  handleIntelTransition(currentStage, intelligenceSeed);

  const intelAmount = (HAS_MIND && intelligenceSeed && currentStage >= 2 && currentStage <= 5) ? 1 : 0;
  planetUniforms.uIntelligence.value = intelAmount;
  planetUniforms.uIntelStage.value = currentStage;

  if (!drag.active) { rotY += velY; velY *= 0.96; }
  const spin = (clockT * 0.00015 * c.rotationSpeed);
  planetGroup.rotation.x = rotX;
  planetGroup.rotation.z = c.axialTilt * Math.PI / 180;
  planetGroup.rotation.y = rotY + spin;

  const primaryColor = primaryStarColor(c.stellarClass, stellar.colorShift);
  suns[0].uniforms.uColor.value.copy(primaryColor);
  suns[0].haloUniforms.uColor.value.copy(primaryColor);
  planetUniforms.uColor0.value.copy(primaryColor);

  planetUniforms.uPostStellar.value = ['ember', 'corpse'].includes(stellar.epoch) ? 1 : 0;
  planetUniforms.uLifePresence.value = lifePresence;

  const starN = Math.min(Math.max(c.starCount, 1), 3);
  const sunDist = 6 + c.distanceToStar * 4;
  for (let i = 0; i < 3; i++) {
    const visible = i < starN && stellar.sizeScale > 0.001;
    suns[i].mesh.visible = visible;
    sunLights[i].visible = visible;
    if (visible) {
      const angle = (i * Math.PI * 2 / starN) + clockT * 0.00003 * (i === 0 ? 1 : 0.6 + i * 0.2);
      const y = i === 0 ? 0 : Math.sin(i * 1.3) * 1.5;
      const x = Math.cos(angle) * sunDist * (1 + i * 0.15);
      const z = Math.sin(angle) * sunDist * (1 + i * 0.15);
      suns[i].mesh.position.set(x, y, z);
      sunLights[i].position.set(x, y, z);
      const scaleBase = Math.max(0.5, 1.3 / c.distanceToStar);
      const s = i === 0 ? scaleBase * stellar.sizeScale : scaleBase;
      suns[i].mesh.scale.setScalar(s);
      suns[i].uniforms.uTime.value = clockT;
      suns[i].uniforms.uSwell.value = i === 0 ? stellar.swell : 0;
      sunLights[i].intensity = 2 * (i === 0 ? stellar.lumScale : 1);
      const dir = new THREE.Vector3(x, y, z).normalize();
      if (i === 0) planetUniforms.uLight0.value.copy(dir);
      if (i === 1) planetUniforms.uLight1.value.copy(dir);
      if (i === 2) planetUniforms.uLight2.value.copy(dir);
    }
  }
  planetUniforms.uLightN.value = starN;

  const moonN = Math.min(Math.max(c.moonCount, 0), 4);
  for (let i = 0; i < 4; i++) {
    const m = moons[i];
    m.mesh.visible = i < moonN;
    if (m.mesh.visible) {
      const a = m.phase + clockT * 0.0002 * m.speed;
      m.mesh.position.set(Math.cos(a) * m.radius, Math.sin(a) * m.radius * m.tilt, Math.sin(a) * m.radius * Math.cos(m.tilt));
    }
  }

  const nearN = Math.min(Math.max(c.nearbyWorldCount, 0), 4);
  for (let i = 0; i < 4; i++) {
    const n = nearbys[i];
    n.mesh.visible = i < nearN;
    if (n.mesh.visible) {
      const a = n.phase + clockT * 0.00005 * n.speed;
      n.mesh.position.set(Math.cos(a) * n.radius, Math.sin(a * 0.5) * n.radius * n.tilt * 0.3, Math.sin(a) * n.radius);
    }
  }

  const atmoCol = new THREE.Color();
  if (stellar.epoch === 'red-giant') atmoCol.setRGB(0.9, 0.4, 0.3);
  else if (c.greenhouse > 0.12) atmoCol.setRGB(0.8, 0.55, 0.35);
  else if (c.atmosphereDensity < 0.3) atmoCol.setRGB(0.3, 0.3, 0.4);
  else if (temp > 70) atmoCol.setRGB(0.85, 0.5, 0.35);
  else if (temp < -20) atmoCol.setRGB(0.6, 0.8, 0.95);
  else if (c.atmosphereComposition === 'toxic') atmoCol.setRGB(0.6, 0.75, 0.35);
  else if (c.atmosphereComposition === 'reducing') atmoCol.setRGB(0.8, 0.65, 0.45);
  else atmoCol.setRGB(0.4, 0.65, 1.0);
  atmoUniforms.uColor.value.copy(atmoCol);
  atmoUniforms.uIntensity.value = Math.min(c.atmosphereDensity * 1.2, 3.5);
  atmosphere.scale.setScalar(1 + Math.min(c.atmosphereDensity * 0.03, 0.15));

  planetUniforms.uTemp.value = temp;
  planetUniforms.uWater.value = c.waterCoverage;
  planetUniforms.uTime.value = clockT;
  planetUniforms.uAtmos.value = c.atmosphereDensity;
  planetUniforms.uTectonic.value = c.tectonicActivity;
  planetUniforms.uAge.value = age;

  cloudUniforms.uTime.value = clockT;
  cloudUniforms.uWind.value = c.windSpeed;
  cloudUniforms.uCoverage.value = c.cloudCoverage;
  cloudUniforms.uAtmos.value = c.atmosphereDensity;
  clouds.rotation.y += 0.0002 * c.windSpeed + 0.00003;

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ═══════════════════════════════════════════════════════════════
//  UI — TABS, CONTROLS, LIBRARY
// ═══════════════════════════════════════════════════════════════

const TIME_SCALES = [
  { label: "⏸", v: 0 }, { label: "1 yr/s", v: 1 }, { label: "100 yr/s", v: 100 },
  { label: "10 Kyr/s", v: 10000 }, { label: "1 Myr/s", v: 1e6 },
  { label: "100 Myr/s", v: 1e8 }, { label: "10 Gyr/s", v: 1e10 },
];

function buildTimebar() {
  const bar = document.getElementById('timebar');
  bar.innerHTML = '';
  TIME_SCALES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'time-btn' + (state.timeScale === t.v ? ' active' : '');
    b.textContent = t.label;
    b.onclick = () => { state.timeScale = t.v; buildTimebar(); };
    bar.appendChild(b);
  });
  const r = document.createElement('button');
  r.className = 'time-btn';
  r.style.marginLeft = '8px';
  r.style.opacity = '0.6';
  r.textContent = '↺ reset age';
  r.onclick = () => {
    age = 0; lastEpoch = 'young'; lastIntelStage = 0;
    intelligenceSeed = null; intelligencePhase = 0; intelligenceEnded = null;
  };
  bar.appendChild(r);
}

function buildPresets() {
  const el = document.getElementById('presets');
  el.innerHTML = '';
  Object.keys(PRESETS).forEach(name => {
    const b = document.createElement('button');
    b.className = 'preset-btn';
    b.textContent = name;
    b.onclick = () => {
      Object.assign(state, PRESETS[name], { timeScale: state.timeScale });
      age = 0; lastEpoch = 'young'; lastIntelStage = 0;
      intelligenceSeed = null; intelligencePhase = 0; intelligenceEnded = null;
      currentWorldId = null;
      refreshLibrary();
      buildTabBody();
    };
    el.appendChild(b);
  });
}

function buildTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  // Base tabs for all veils
  const tabList = [
    { key: "system", label: "system", intel: false },
    { key: "atmos", label: "atmos", intel: false },
    { key: "surface", label: "surface", intel: false },
  ];
  // Life tab — Filter and Mind only
  if (HAS_LIFE) tabList.push({ key: "life", label: "life", intel: false });
  // Mind tab — Mind only
  if (HAS_MIND) tabList.push({ key: "intel", label: "mind", veiled: !intelligenceSeed, intel: true });
  tabList.push({ key: "deep", label: "deep", intel: false });

  tabList.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tab';
    if (t.intel) b.classList.add('intel');
    if (activeTab === t.key) b.classList.add('active');
    if (t.veiled) b.classList.add('veiled');
    else if (t.intel) b.classList.add('unlocked');
    b.textContent = t.label;
    b.onclick = () => {
      if (t.veiled) return;
      activeTab = t.key; buildTabs(); buildTabBody();
    };
    tabs.appendChild(b);
  });
}

function sliderEl(label, unit, min, max, step, key, displayX = 1) {
  const wrap = document.createElement('div');
  wrap.className = 'slider-block';
  const head = document.createElement('div');
  head.className = 'slider-head';
  const lab = document.createElement('span');
  lab.className = 'slider-label';
  lab.textContent = label;
  const val = document.createElement('span');
  val.className = 'slider-val';
  const fmt = () => {
    const v = state[key] * displayX;
    const decimals = displayX === 100 ? 0 : step < 0.1 ? 3 : step < 1 ? 2 : 1;
    val.innerHTML = `${v.toFixed(decimals)}${unit ? `<span style="opacity:0.5; margin-left:3px;">${unit}</span>` : ''}`;
  };
  fmt();
  head.appendChild(lab); head.appendChild(val);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.step = step;
  input.value = state[key];
  input.oninput = (e) => { state[key] = parseFloat(e.target.value); fmt(); };
  wrap.appendChild(head); wrap.appendChild(input);
  return wrap;
}

function stepperEl(label, min, max, key) {
  const wrap = document.createElement('div');
  wrap.className = 'slider-block';
  const head = document.createElement('div');
  head.className = 'slider-head';
  const lab = document.createElement('span');
  lab.className = 'slider-label';
  lab.textContent = label;
  const box = document.createElement('div');
  box.className = 'stepper-box';
  const minus = document.createElement('button');
  minus.className = 'step-btn'; minus.textContent = '−';
  const val = document.createElement('span');
  val.className = 'step-val'; val.textContent = state[key];
  const plus = document.createElement('button');
  plus.className = 'step-btn'; plus.textContent = '+';
  minus.onclick = () => { state[key] = Math.max(min, state[key] - 1); val.textContent = state[key]; };
  plus.onclick = () => { state[key] = Math.min(max, state[key] + 1); val.textContent = state[key]; };
  box.appendChild(minus); box.appendChild(val); box.appendChild(plus);
  head.appendChild(lab); head.appendChild(box);
  wrap.appendChild(head);
  return wrap;
}

function selectEl(label, key, options) {
  const wrap = document.createElement('div');
  wrap.className = 'slider-block';
  const lab = document.createElement('div');
  lab.className = 'slider-label';
  lab.style.marginBottom = '2px';
  lab.textContent = label;
  const sel = document.createElement('select');
  sel.className = 'select-box';
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label;
    if (state[key] === o.value) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = (e) => { state[key] = e.target.value; };
  wrap.appendChild(lab); wrap.appendChild(sel);
  return wrap;
}

function stateRow(k, v) {
  const r = document.createElement('div');
  r.className = 'state-row';
  r.innerHTML = `<span class="state-k">${k}</span><span class="state-v">${v}</span>`;
  return r;
}

function layerHead(text, intel = false) {
  const el = document.createElement('div');
  el.className = 'layer-head' + (intel ? ' intel' : '');
  el.textContent = text;
  return el;
}

function tagList(tags, emptyMsg) {
  const wrap = document.createElement('div');
  if (!tags || tags.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty-msg';
    e.textContent = emptyMsg || '—';
    wrap.appendChild(e); return wrap;
  }
  const list = document.createElement('div');
  list.className = 'tag-list';
  tags.forEach(t => {
    const tag = document.createElement('span');
    tag.className = 'tag ' + t.cls;
    tag.textContent = t.k;
    list.appendChild(tag);
  });
  wrap.appendChild(list); return wrap;
}

function buildIntelligenceTab(body) {
  if (!HAS_MIND) return;
  const T = computeTemperature(state);
  const stellar = stellarState(state.stellarClass, age);
  const potential = intelligencePotential(state, T, stellar);
  const currentStage = intelligenceSeed ? intelligenceStage(intelligenceSeed, age, potential, state, T, stellar) : 0;

  const note = document.createElement('div');
  note.className = 'note';
  if (!intelligenceSeed) note.textContent = 'This layer holds the world\'s history of mind. When and if something emerges here, it will appear below — and it will persist, even if you change conditions afterwards.';
  else note.textContent = 'A mind emerged on this world. Its substrate, its aesthetic, its arc. Scroll slowly.';
  body.appendChild(note);

  if (intelligenceSeed) {
    body.appendChild(layerHead('SIGNATURE', true));
    const sig = document.createElement('div');
    [
      ['Substrate', intelligenceSeed.substrate],
      ['Form', intelligenceSeed.form],
      ['Aesthetic', intelligenceSeed.aesthetic],
      ['Cognition', intelligenceSeed.cognition.join(' · ')],
      ['Emerged', formatAge(intelligenceSeed.bornAt)],
      ['Under', `${intelligenceSeed.stellarClass}-class star`],
    ].forEach(([k, v]) => {
      const r = document.createElement('div');
      r.className = 'signature';
      r.innerHTML = `<span class="signature-k">${k}</span><span class="signature-v">${v}</span>`;
      sig.appendChild(r);
    });
    body.appendChild(sig);
  }

  body.appendChild(layerHead('ARC', true));
  if (intelligenceSeed) {
    [1,2,3,4,5].forEach(stageNum => {
      const desc = stageDescription(stageNum, intelligenceSeed);
      const card = document.createElement('div');
      card.className = 'stage-card';
      if (stageNum < currentStage) card.classList.add('past');
      else if (stageNum === currentStage) card.classList.add('current');
      else card.style.opacity = '0.3';
      const mark = document.createElement('div');
      mark.className = 'stage-mark';
      mark.innerHTML = `<span>STAGE ${stageNum}${stageNum === currentStage ? ' · CURRENT' : stageNum < currentStage ? ' · PAST' : ''}</span><span class="age"></span>`;
      const title = document.createElement('div');
      title.className = 'stage-title'; title.textContent = desc.title;
      const text = document.createElement('div');
      text.className = 'stage-desc'; text.textContent = desc.desc;
      card.appendChild(mark); card.appendChild(title); card.appendChild(text);
      body.appendChild(card);
    });
    if (currentStage === 6) {
      const desc = stageDescription(6, intelligenceSeed);
      const card = document.createElement('div');
      card.className = 'stage-card current';
      card.innerHTML = `<div class="stage-mark"><span>STAGE 6 · ENDED</span><span class="age">${formatAge(intelligenceEnded?.endedAt || age)}</span></div><div class="stage-title">${desc.title}</div><div class="stage-desc">${desc.desc}</div>`;
      body.appendChild(card);
    }
  } else {
    const e = document.createElement('div');
    e.className = 'empty-msg'; e.textContent = 'No seed has taken hold.';
    body.appendChild(e);
  }

  body.appendChild(layerHead('ASSESSMENT', true));
  const assessment = fermiAssessment(state, T, stellar, potential, intelligenceSeed, currentStage);
  const f = document.createElement('div');
  f.className = 'fermi-bar ' + (assessment.tone || '');
  f.textContent = assessment.text;
  body.appendChild(f);

  if (intelligenceSeed && currentStage >= 3) {
    body.appendChild(layerHead('VAULT ENTRY', true));
    const v = document.createElement('div');
    v.className = 'vault-entry';
    v.innerHTML = `<div class="vault-head">WORLD · ${state.stellarClass}-CLASS · ${formatAge(age)}</div><div class="vault-body">${vaultEntryText(intelligenceSeed, currentStage)}</div>`;
    body.appendChild(v);
  }
}

function vaultEntryText(seed, stage) {
  const stageNames = { 3: 'industry', 4: 'the network', 5: 'the long after', 6: 'silence' };
  const curr = stageNames[stage] || 'something';
  const lines = [];
  lines.push(`They arose <em>${formatAge(age - seed.bornAt)}</em> after the first mind stirred.`);
  lines.push(`Substrate: <em>${seed.substrate}</em>. Form: <em>${seed.form}</em>.`);
  lines.push(`Their signature is <em>${seed.aesthetic}</em>, their cognition <em>${seed.cognition.join(', ')}</em>.`);
  if (stage === 6) lines.push(`They reached ${curr}. Cause: <em>${intelligenceEnded?.cause || 'unknown'}</em>.`);
  else lines.push(`They are presently at <em>${curr}</em>.`);
  return lines.join(' ');
}

function buildTabBody() {
  const body = document.getElementById('tab-body');
  body.innerHTML = '';
  if (activeTab === "system") {
    body.appendChild(selectEl("Stellar class", "stellarClass", [
      { value: 'O', label: 'O — blue supergiant (short-lived)' },
      { value: 'B', label: 'B — blue-white' },
      { value: 'A', label: 'A — white' },
      { value: 'F', label: 'F — yellow-white' },
      { value: 'G', label: 'G — yellow, like Sol' },
      { value: 'K', label: 'K — orange (long-lived)' },
      { value: 'M', label: 'M — red dwarf (ancient)' },
    ]));
    body.appendChild(sliderEl("Distance to star", "AU", 0.05, 4, 0.01, "distanceToStar"));
    body.appendChild(stepperEl("Stars in system", 1, 3, "starCount"));
    body.appendChild(stepperEl("Moons", 0, 4, "moonCount"));
    body.appendChild(stepperEl("Nearby worlds", 0, 4, "nearbyWorldCount"));
    body.appendChild(sliderEl("Axial tilt", "°", 0, 90, 0.5, "axialTilt"));
    body.appendChild(sliderEl("Rotation speed", "×", 0.1, 5, 0.1, "rotationSpeed"));
  } else if (activeTab === "atmos") {
    body.appendChild(sliderEl("Atmospheric density", "atm", 0, 5, 0.05, "atmosphereDensity"));
    body.appendChild(sliderEl("Greenhouse (CO₂ equiv.)", "", 0, 0.4, 0.005, "greenhouse"));
    body.appendChild(selectEl("Composition", "atmosphereComposition", [
      { value: 'oxidizing', label: 'oxidizing (O₂-rich)' },
      { value: 'reducing', label: 'reducing (CH₄ / NH₃)' },
      { value: 'inert', label: 'inert (N₂ / noble gases)' },
      { value: 'toxic', label: 'toxic (sulfur / chlorine)' },
      { value: 'thick-co2', label: 'thick CO₂' },
    ]));
    body.appendChild(sliderEl("Wind speed", "×", 0, 5, 0.1, "windSpeed"));
    body.appendChild(sliderEl("Cloud coverage", "%", 0, 1, 0.01, "cloudCoverage", 100));
    body.appendChild(sliderEl("Albedo (reflectivity)", "", 0.05, 0.95, 0.01, "albedo"));
  } else if (activeTab === "surface") {
    body.appendChild(sliderEl("H₂O coverage", "%", 0, 1, 0.01, "waterCoverage", 100));
    body.appendChild(sliderEl("Tectonic activity", "", 0, 1, 0.01, "tectonicActivity"));
    body.appendChild(sliderEl("Gravity", "g", 0.1, 4, 0.05, "gravity"));
    body.appendChild(sliderEl("Radiation level", "", 0, 1, 0.01, "radiationLevel"));
  } else if (activeTab === "life" && HAS_LIFE) {
    if (!IS_HELD) {
      // Glimpse mode — show the quiet notice, no layers
      const notice = document.createElement('div');
      notice.className = 'glimpse-notice';
      notice.innerHTML = '<strong>— GLIMPSED —</strong>The deep layers are visible to those who hold this veil. What lifts: possibility, pressure, collapse — what a world permits, rewards, and ends.<br><br><a href="/world-vault/lift?veil=' + VEIL + '" style="color:rgba(210,225,250,0.95);text-decoration:none;border-bottom:1px solid rgba(210,225,250,0.4);">Lift this veil →</a>';
      body.appendChild(notice);
      return;
    }
    const T = computeTemperature(state);
    const stellar = stellarState(state.stellarClass, age);
    const lifePresence = computeLifePresence(state, T, stellar);
    const note = document.createElement('div');
    note.className = 'note';
    if (age < 1e8) note.textContent = 'The world is still cooling into itself. The filter is not yet open.';
    else if (lifePresence < 0.05) note.textContent = 'No coherent biosphere at present. The world waits, or has ended.';
    else note.textContent = 'What the world permits, presses for, threatens, and — in time — may think.';
    body.appendChild(note);
    body.appendChild(layerHead('POSSIBILITY · what is plausible'));
    body.appendChild(tagList(possibilityLayer(state, T, stellar, lifePresence), 'silence'));
    body.appendChild(layerHead('PRESSURE · what this world rewards'));
    body.appendChild(tagList(pressureLayer(state, T, stellar, lifePresence), '—'));
    body.appendChild(layerHead('COLLAPSE · what kills life here'));
    body.appendChild(tagList(collapseLayer(state, T, stellar, lifePresence), '—'));
    if (HAS_MIND && intelligenceSeed) {
      const ptr = document.createElement('div');
      ptr.className = 'note';
      ptr.style.marginTop = '14px';
      ptr.style.color = 'rgba(190,210,245,0.75)';
      ptr.textContent = '→ A mind has emerged. See the Mind tab.';
      body.appendChild(ptr);
    }
  } else if (activeTab === "intel" && HAS_MIND) {
    if (!IS_HELD) {
      const notice = document.createElement('div');
      notice.className = 'glimpse-notice';
      notice.innerHTML = '<strong>— GLIMPSED —</strong>Welcome to mind, if conditions permit it. The full arc, from stirring through silence — held for those who hold this veil.<br><br><a href="/world-vault/lift?veil=mind" style="color:rgba(210,225,250,0.95);text-decoration:none;border-bottom:1px solid rgba(210,225,250,0.4);">Lift this veil →</a>';
      body.appendChild(notice);
      return;
    }
    buildIntelligenceTab(body);
  } else if (activeTab === "deep") {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Fields beneath the surface. Effects are slow, often invisible, occasionally decisive.';
    body.appendChild(note);
    body.appendChild(sliderEl("Magnetic field", "×", 0, 3, 0.05, "magneticField"));
    const div = document.createElement('div');
    div.className = 'divider';
    body.appendChild(div);
    const block = document.createElement('div');
    block.className = 'state-block';
    const T = computeTemperature(state);
    const stellar = stellarState(state.stellarClass, age);
    const s = STELLAR_CLASSES[state.stellarClass];
    block.appendChild(stateRow('Stellar class', `${state.stellarClass} · ${epochLabel(stellar.epoch)}`));
    block.appendChild(stateRow('Main-sequence lifetime', formatAge(s.life)));
    block.appendChild(stateRow('Star luminosity', `${effectiveLuminosity(state, stellar).toFixed(3)} L`));
    block.appendChild(stateRow('Solar flux', ((s.luminosity * stellar.lumScale * state.starCount) / (state.distanceToStar ** 2)).toFixed(3)));
    block.appendChild(stateRow('Equilibrium temp', formatTemp(T)));
    block.appendChild(stateRow('Atmosphere retention', state.magneticField > 0.25 ? 'stable' : 'leaking'));
    block.appendChild(stateRow('Water state', T < -5 ? 'frozen' : T > 140 ? 'absent' : T > 100 ? 'vapor-dominant' : 'liquid'));
    block.appendChild(stateRow('Tidal forcing', state.moonCount === 0 ? 'none' : state.moonCount === 1 ? 'moderate' : state.moonCount >= 3 ? 'chaotic' : 'coupled'));
    block.appendChild(stateRow('Stellar regime', state.starCount === 1 ? 'solar' : state.starCount === 2 ? 'binary' : 'trinary'));
    block.appendChild(stateRow('Age / lifetime', `${(age / s.life * 100).toFixed(2)}%`));
    if (HAS_MIND) {
      block.appendChild(stateRow('Intelligence potential', `${(intelligencePotential(state, T, stellar) * 100).toFixed(0)}%`));
      if (intelligenceSeed) {
        block.appendChild(stateRow('Mind emerged at', formatAge(intelligenceSeed.bornAt)));
        block.appendChild(stateRow('Mind stage', `${intelligencePhase}`));
      }
    }
    body.appendChild(block);
  }
}

// ═══════════════════════════════════════════════════════════════
//  READOUT + ORACLE TICKS
// ═══════════════════════════════════════════════════════════════

setInterval(() => {
  document.getElementById('r-age').textContent = formatAge(age);
  const T = computeTemperature(state);
  document.getElementById('r-temp').textContent = formatTemp(T);
  const hab = computeHabitability(state, T);
  const el = document.getElementById('r-hab');
  el.textContent = (hab * 100).toFixed(0) + '%';
  el.style.color = hab > 0.6 ? '#9cc9ae' : hab > 0.3 ? '#d4b978' : '#c88a76';
  const stellar = stellarState(state.stellarClass, age);
  const badge = document.getElementById('epoch-badge');
  badge.textContent = epochLabel(stellar.epoch);
  badge.className = 'epoch-badge ' + epochBadgeClass(stellar.epoch);
  if (HAS_MIND) {
    const intelTabVeiled = document.querySelector('.tab.intel.veiled');
    const intelTabUnlocked = document.querySelector('.tab.intel.unlocked');
    if (intelligenceSeed && intelTabVeiled) buildTabs();
    if (!intelligenceSeed && intelTabUnlocked) buildTabs();
  }
  if (activeTab === 'deep' || activeTab === 'life' || activeTab === 'intel') buildTabBody();
}, 300);

let lastOracle = '';
setInterval(() => {
  const T = computeTemperature(state);
  const stellar = stellarState(state.stellarClass, age);
  const lifePresence = HAS_LIFE ? computeLifePresence(state, T, stellar) : 0;
  const { text: msg, intel } = oracleMessage(state, T, age, stellar, lifePresence, intelligenceSeed, intelligencePhase);
  const el = document.getElementById('oracle');
  const text = document.getElementById('oracle-text');
  const mark = document.getElementById('oracle-mark');
  if (msg && msg !== lastOracle) {
    text.textContent = msg;
    mark.textContent = intel ? 'INTELLIGENCE' : 'ORACLE';
    mark.className = 'oracle-mark' + (intel ? ' intel' : '');
    el.style.display = 'block';
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
    lastOracle = msg;
  } else if (!msg) {
    el.style.display = 'none';
    lastOracle = '';
  }
}, 1400);

// ═══════════════════════════════════════════════════════════════
//  VAULT LIBRARY (shared across all veils)
// ═══════════════════════════════════════════════════════════════

const LIBRARY_KEY = 'worldVault.library.v1';
let currentWorldId = null;

function generateSeed() {
  const rng = new Uint8Array(6);
  crypto.getRandomValues(rng);
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = 'vlt-';
  for (let i = 0; i < 4; i++) s += chars[rng[i] % chars.length];
  s += '-';
  for (let i = 4; i < 6; i++) s += chars[rng[i] % chars.length];
  return s;
}

function captureThumbnail() {
  renderer.render(scene, camera);
  const src = renderer.domElement;
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const srcW = src.width, srcH = src.height;
  const s = Math.min(srcW, srcH);
  const sx = (srcW - s) / 2, sy = (srcH - s) / 2;
  ctx.drawImage(src, sx, sy, s, s, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

function captureRecord(seed, name) {
  const T = computeTemperature(state);
  const stellar = stellarState(state.stellarClass, age);
  const lifePresence = HAS_LIFE ? computeLifePresence(state, T, stellar) : 0;
  return {
    seed,
    name: name || autoName(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: captureThumbnail(),
    state: { ...state },
    age,
    temp: T,
    habitability: computeHabitability(state, T),
    stellarEpoch: stellar.epoch,
    lifePresence,
    intelligenceSeed: intelligenceSeed ? { ...intelligenceSeed } : null,
    intelligencePhase,
    intelligenceEnded: intelligenceEnded ? { ...intelligenceEnded } : null,
    veil: intelligenceSeed ? 'mind' : lifePresence > 0.05 ? 'filter' : 'becoming',
    savedFrom: VEIL,
    version: 1,
  };
}

function autoName() {
  const T = computeTemperature(state);
  const parts = [];
  if (intelligenceSeed) {
    const sub = intelligenceSeed.substrate;
    parts.push(sub === 'aquatic' ? 'Reef' : sub === 'dryland' ? 'Waylands' : sub === 'aerial' ? 'Winddrift' : sub === 'subterranean' ? 'Stoneworld' : sub === 'terminator' ? 'Twilight' : 'World');
  } else if (state.waterCoverage > 0.95) parts.push('Ocean');
  else if (state.waterCoverage < 0.1) parts.push('Desert');
  else if (T < -20) parts.push('Frostland');
  else if (T > 60) parts.push('Emberworld');
  else if (state.starCount === 2) parts.push('Bright Twin');
  else if (state.starCount === 3) parts.push('Three-sun');
  else if (state.stellarClass === 'M') parts.push('Red-lit');
  else parts.push('Terrawild');
  parts.push('·'); parts.push(formatAge(age));
  return parts.join(' ');
}

function loadRecord(rec) {
  Object.assign(state, rec.state, { timeScale: state.timeScale });
  age = rec.age;
  intelligenceSeed = (HAS_MIND && rec.intelligenceSeed) ? { ...rec.intelligenceSeed } : null;
  intelligencePhase = HAS_MIND ? (rec.intelligencePhase || 0) : 0;
  intelligenceEnded = (HAS_MIND && rec.intelligenceEnded) ? { ...rec.intelligenceEnded } : null;
  lastIntelStage = intelligencePhase;
  lastEpoch = rec.stellarEpoch || 'young';
  currentWorldId = rec.seed;
  buildTabBody();
  buildTabs();
  refreshLibrary();
}

const storage = {
  all() { try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; } catch { return []; } },
  save(records) { localStorage.setItem(LIBRARY_KEY, JSON.stringify(records)); },
  upsert(rec) {
    const all = this.all();
    const idx = all.findIndex(r => r.seed === rec.seed);
    if (idx >= 0) all[idx] = rec; else all.unshift(rec);
    this.save(all);
  },
  remove(seed) { this.save(this.all().filter(r => r.seed !== seed)); },
  rename(seed, name) {
    const all = this.all();
    const r = all.find(r => r.seed === seed);
    if (r) { r.name = name; r.updatedAt = Date.now(); this.save(all); }
  },
};

function refreshLibrary() {
  const records = storage.all();
  const count = records.length;
  const countEl = document.getElementById('library-count');
  const subEl = document.getElementById('library-sub');
  if (countEl) countEl.textContent = count ? `${count}` : '';
  if (subEl) subEl.textContent = count === 0 ? '— empty' : count === 1 ? '1 world held' : `${count} worlds held`;
  const body = document.getElementById('library-body');
  if (!body) return;
  body.innerHTML = '';
  if (count === 0) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.innerHTML = `<div class="library-empty-mark">— VAULT —</div><div>Worlds you save will be held here.</div><div style="margin-top: 10px; opacity: 0.7; font-size: 10px;">Each one, a particular world.</div>`;
    body.appendChild(empty);
    return;
  }

  records.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'world-card' + (rec.seed === currentWorldId ? ' active' : '');
    const thumb = document.createElement('img');
    thumb.className = 'world-thumb';
    thumb.src = rec.thumbnail; thumb.alt = '';
    const info = document.createElement('div');
    info.className = 'world-info';
    const topGroup = document.createElement('div');
    const nameRow = document.createElement('div');
    nameRow.className = 'world-name'; nameRow.textContent = rec.name;
    const seedRow = document.createElement('div');
    seedRow.className = 'world-seed'; seedRow.textContent = rec.seed;
    topGroup.appendChild(nameRow); topGroup.appendChild(seedRow);

    const meta = document.createElement('div');
    meta.className = 'world-meta';
    const metaParts = [ `${rec.state.stellarClass}·${formatAge(rec.age)}`, `${(rec.habitability * 100).toFixed(0)}%` ];
    metaParts.forEach(p => { const span = document.createElement('span'); span.textContent = p; meta.appendChild(span); });

    // Mind marker — only visible if we're in Mind veil (has full sight)
    if (HAS_MIND && rec.intelligenceSeed) {
      const mindMark = document.createElement('span');
      mindMark.className = 'mind-mark';
      mindMark.textContent = `◆ ${rec.intelligenceSeed.substrate}`;
      meta.appendChild(mindMark);
    }
    // Held-elsewhere marker — if the record has depth this veil can't show
    const recordDepth = rec.veil; // 'becoming' | 'filter' | 'mind'
    const veilOrder = { becoming: 0, filter: 1, mind: 2 };
    if (veilOrder[recordDepth] > veilOrder[VEIL]) {
      const m = document.createElement('span');
      m.className = 'held-elsewhere';
      if (recordDepth === 'filter' && VEIL === 'becoming') m.textContent = 'holds life · visible in deeper veils';
      else if (recordDepth === 'mind' && VEIL === 'becoming') m.textContent = 'holds a mind · visible in deeper veils';
      else if (recordDepth === 'mind' && VEIL === 'filter') m.textContent = 'holds a mind · visible in Mind';
      meta.appendChild(m);
    }

    info.appendChild(topGroup); info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'world-actions';
    const renameBtn = document.createElement('button');
    renameBtn.className = 'world-action'; renameBtn.textContent = '✎'; renameBtn.title = 'Rename';
    renameBtn.onclick = (e) => { e.stopPropagation(); startRename(card, nameRow, rec); };
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'world-action'; deleteBtn.textContent = '−'; deleteBtn.title = 'Remove';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Remove "${rec.name}" from the vault?`)) {
        storage.remove(rec.seed);
        if (currentWorldId === rec.seed) currentWorldId = null;
        refreshLibrary();
      }
    };
    actions.appendChild(renameBtn); actions.appendChild(deleteBtn);

    card.appendChild(thumb); card.appendChild(info); card.appendChild(actions);
    card.onclick = () => { loadRecord(rec); };
    body.appendChild(card);
  });
}

function startRename(card, nameEl, rec) {
  const input = document.createElement('input');
  input.className = 'rename-input'; input.value = rec.name; input.maxLength = 60;
  nameEl.replaceWith(input);
  input.focus(); input.select();
  const commit = () => { const v = input.value.trim() || rec.name; storage.rename(rec.seed, v); refreshLibrary(); };
  input.onblur = commit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = rec.name; input.blur(); }
  };
}

// ═══════════════════════════════════════════════════════════════
//  PANEL / LIBRARY / SAVE wiring
// ═══════════════════════════════════════════════════════════════

const panel = document.getElementById('panel');
const panelToggle = document.getElementById('panel-toggle');
let panelCollapsed = false;
panelToggle.onclick = () => {
  panelCollapsed = !panelCollapsed;
  panel.classList.toggle('collapsed', panelCollapsed);
  panelToggle.classList.toggle('panel-open', !panelCollapsed);
  panelToggle.textContent = panelCollapsed ? '⋮' : '×';
};

const library = document.getElementById('library');
const libraryToggle = document.getElementById('library-toggle');
const libraryWrap = document.getElementById('library-toggle-wrap');
let libraryOpen = false;
libraryToggle.onclick = () => {
  libraryOpen = !libraryOpen;
  library.classList.toggle('open', libraryOpen);
  libraryWrap.classList.toggle('library-open', libraryOpen);
  libraryToggle.textContent = libraryOpen ? '×' : '◇';
  if (libraryOpen) refreshLibrary();
};

// Save button — only rendered if held. In glimpse mode, the footer renders a lift link instead.
const saveBtn = document.getElementById('save-btn');
if (saveBtn && IS_HELD) {
  saveBtn.onclick = () => {
    const seed = currentWorldId || generateSeed();
    const existing = storage.all().find(r => r.seed === seed);
    const rec = captureRecord(seed, existing?.name);
    storage.upsert(rec);
    currentWorldId = seed;
    saveBtn.classList.add('saving');
    saveBtn.textContent = '✓ held';
    setTimeout(() => { saveBtn.classList.remove('saving'); saveBtn.textContent = '◉ save to vault'; }, 1400);
    refreshLibrary();
  };
}

const resetBtn = document.getElementById('reset-terra');
if (resetBtn) {
  resetBtn.onclick = () => {
    Object.assign(state, PRESETS.Terra, { timeScale: state.timeScale });
    age = 0; lastEpoch = 'young'; lastIntelStage = 0;
    intelligenceSeed = null; intelligencePhase = 0; intelligenceEnded = null;
    currentWorldId = null;
    refreshLibrary(); buildTabBody();
  };
}

// ─── Entry curtain lift ───
function liftCurtain(){
  const curtain = document.getElementById('entry-curtain');
  if (curtain) setTimeout(() => curtain.classList.add('lifting'), 2200);
}

// ─── Fullscreen + cursor auto-hide ───
// Press F to enter/exit fullscreen. Esc exits (browser-enforced).
// Inside fullscreen, the cursor fades after 3 seconds of no movement
// and returns the moment it's moved again.
(function setupFullscreenRitual() {
  const CURSOR_HIDE_DELAY = 3000; // ms
  let cursorTimer = null;

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function showCursor() {
    document.documentElement.style.cursor = '';
    if (cursorTimer) clearTimeout(cursorTimer);
    if (isFullscreen()) {
      cursorTimer = setTimeout(() => {
        document.documentElement.style.cursor = 'none';
      }, CURSOR_HIDE_DELAY);
    }
  }

  function clearCursorRitual() {
    if (cursorTimer) clearTimeout(cursorTimer);
    cursorTimer = null;
    document.documentElement.style.cursor = '';
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }

  // F toggles fullscreen.
  // Ignore the keystroke when a text field is focused (e.g. renaming a world).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    if (isFullscreen()) exitFullscreen();
    else enterFullscreen();
  });

  // When fullscreen state changes, start or stop the cursor ritual.
  function onFsChange() {
    if (isFullscreen()) {
      showCursor(); // starts the 3s fade timer
    } else {
      clearCursorRitual();
    }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // Any pointer movement in fullscreen brings the cursor back and restarts the timer.
  document.addEventListener('mousemove', () => {
    if (isFullscreen()) showCursor();
  });
  document.addEventListener('pointerdown', () => {
    if (isFullscreen()) showCursor();
  });
})();

// ─── Initialize ───
buildPresets();
buildTabs();
buildTabBody();
buildTimebar();
refreshLibrary();
liftCurtain();

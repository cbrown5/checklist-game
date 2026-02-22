// ═══════════════════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════
const SFX = (() => {
  let ctx;
  const C = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const T = (f, tp, d, v, dl) => {
    dl = dl || 0; v = v || 0.3;
    const c = C(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = tp; o.frequency.value = f;
    const t = c.currentTime + dl;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.start(t); o.stop(t + d + 0.05);
  };
  const N = (d, v, dl) => {
    dl = dl || 0; v = v || 0.15;
    const c = C(), n = Math.floor(c.sampleRate * d);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < n; i++) dat[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; src.connect(g); g.connect(c.destination);
    const t = c.currentTime + dl;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.start(t);
  };
  return {
    tick()    { T(880,'sine',0.12,0.25); T(1320,'sine',0.08,0.15,0.05); },
    part()    { T(330,'square',0.04,0.08); T(550,'square',0.04,0.08,0.05); T(880,'square',0.1,0.12,0.1); },
    complete(){ [523,659,784,1047].forEach((f,i)=>T(f,'sine',0.3,0.3,i*0.12)); },
    launch()  {
      N(3.5, 0.4);
      const c=C(), o=c.createOscillator(), g=c.createGain();
      o.connect(g); g.connect(c.destination); o.type='sawtooth';
      o.frequency.setValueAtTime(110,c.currentTime);
      o.frequency.exponentialRampToValueAtTime(35,c.currentTime+3);
      g.gain.setValueAtTime(0.3,c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+3);
      o.start(c.currentTime); o.stop(c.currentTime+3.1);
    },
    win() { [523,659,784,1047,784,1047,1319].forEach((f,i)=>T(f,'sine',0.25,0.35,i*0.15)); },
  };
})();

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════
const COLS = [
  {hex:0x4488ff,css:'#4488ff'},{hex:0xff4466,css:'#ff4466'},
  {hex:0x44ff88,css:'#44ff88'},{hex:0xffaa22,css:'#ffaa22'},
  {hex:0xcc44ff,css:'#cc44ff'},{hex:0x22ddff,css:'#22ddff'},
];

const PART_NAMES = ['lFoot','rFoot','lLeg','rLeg','torso','lArm','rArm','head','pack'];
const PART_LABELS = ['Left Foot','Right Foot','Left Leg','Right Leg','Torso','Left Arm','Right Arm','Head','Rocket Pack!'];

// ═══════════════════════════════════════════════════════════════
//  SETUP SCREEN STARS
// ═══════════════════════════════════════════════════════════════
(function(){
  const bg = document.getElementById('sbg');
  for(let i=0;i<120;i++){
    const s=document.createElement('div'); s.className='st';
    const sz=Math.random()*2.5+0.5;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;--d:${(Math.random()*3+1).toFixed(1)}s;animation-delay:${(Math.random()*3).toFixed(1)}s`;
    bg.appendChild(s);
  }
})();

// ═══════════════════════════════════════════════════════════════
//  SETUP CONTROLS
// ═══════════════════════════════════════════════════════════════
let numP = 2;
const nd = document.getElementById('ndisp');
document.getElementById('dec').onclick = () => { if(numP>1) nd.textContent=--numP; };
document.getElementById('inc').onclick = () => { if(numP<6) nd.textContent=++numP; };
document.getElementById('startbtn').onclick = startGame;

// ═══════════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════════
let GS=null, PG=null, PS=null;

function startGame(){
  SFX.tick();
  document.getElementById('setup').style.display='none';
  document.getElementById('game').classList.add('on');
  document.getElementById('gtitle').textContent=CONFIG.title;
  GS={
    N:numP,
    items:CONFIG.items,
    players:Array.from({length:numP},(_,i)=>({
      id:i, color:COLS[i%COLS.length],
      checked:new Array(CONFIG.items.length).fill(false),
      built:0, done:false,
    })),
  };
  buildUI();
  initPhaser();
}

// ═══════════════════════════════════════════════════════════════
//  CHECKLIST UI
// ═══════════════════════════════════════════════════════════════
function buildUI(){
  const ov=document.getElementById('ov'); ov.innerHTML='';
  GS.players.forEach((p,pi)=>{
    if(pi>0){ const d=document.createElement('div'); d.className='cdiv'; ov.appendChild(d); }
    const col=document.createElement('div'); col.className='pcol';
    const nm=document.createElement('div'); nm.className='pname';
    nm.style.color=p.color.css; nm.style.textShadow=`0 0 12px ${p.color.css}`;
    nm.textContent=`Player ${pi+1}`; col.appendChild(nm);
    const panel=document.createElement('div'); panel.className='cpanel';
    panel.style.borderColor=p.color.css+'55';
    GS.items.forEach((item,ii)=>{
      const row=document.createElement('div'); row.className='ci'; row.id=`r${pi}_${ii}`;
      row.innerHTML=`<div class="cb" id="cb${pi}_${ii}"></div><span class="ie">${item.emoji}</span><span class="iname">${item.name}</span>`;
      row.addEventListener('click',()=>onTick(pi,ii));
      panel.appendChild(row);
    });
    col.appendChild(panel); ov.appendChild(col);
  });
}

function onTick(pi,ii){
  const p=GS.players[pi];
  if(p.done||p.checked[ii]) return;
  p.checked[ii]=true; SFX.tick();
  document.getElementById(`r${pi}_${ii}`).classList.add('ck');
  document.getElementById(`cb${pi}_${ii}`).textContent='✓';
  const itemIdx=p.built++;
  const total=GS.items.length;
  // Map item index evenly across 9 robot parts
  const partIdx=Math.min(Math.floor(itemIdx*(PART_NAMES.length)/total), PART_NAMES.length-1);
  if(PS) PS.events.emit('addPart',pi,partIdx);
  if(p.checked.every(Boolean)&&!p.done){
    p.done=true; SFX.complete();
    setTimeout(()=>{ if(PS) PS.events.emit('launch',pi); },700);
  }
}

// ═══════════════════════════════════════════════════════════════
//  PHASER INIT
// ═══════════════════════════════════════════════════════════════
function initPhaser(){
  const el=document.getElementById('pc');
  PG=new Phaser.Game({
    type:Phaser.AUTO,
    width:el.clientWidth||window.innerWidth,
    height:el.clientHeight||(window.innerHeight-44),
    backgroundColor:'#000010',
    parent:'pc',
    transparent:false,
    scene:GameScene,
    scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},
  });
}

// ═══════════════════════════════════════════════════════════════
//  PHASER SCENE
// ═══════════════════════════════════════════════════════════════
class GameScene extends Phaser.Scene {
  constructor(){ super({key:'GameScene'}); }
  preload(){}

  create(){
    PS=this;
    const W=this.scale.width, H=this.scale.height;

    this.stars=Array.from({length:200},()=>({
      x:Math.random()*W, y:Math.random()*H*0.88,
      r:Math.random()*1.6+0.3,
      ph:Math.random()*Math.PI*2,
      sp:Math.random()*3+1,
    }));

    this.bgG  =this.add.graphics().setDepth(0);
    this.gndG =this.add.graphics().setDepth(2);
    this.padG =this.add.graphics().setDepth(3);

    this.robs=GS.players.map(()=>({
      gfx:     this.add.graphics().setDepth(10),
      exGfx:   this.add.graphics().setDepth(9),
      parts:   [],
      vy:0, offsetY:0,
      launching:false, gone:false,
      shakeX:0, exTimer:0,
      flashT:0, flashOn:false,
    }));

    this.floats=[];
    this.camShake=0;
    this.bgTimer=0;

    this.drawAll();

    this.scale.on('resize',()=>{
      const nW=this.scale.width, nH=this.scale.height;
      this.stars.forEach(s=>{ s.x=Math.random()*nW; s.y=Math.random()*nH*0.88; });
      this.drawAll();
    });

    this.events.on('addPart',(pi,partIdx)=>this.addPart(pi,partIdx));
    this.events.on('launch', (pi)=>this.doLaunch(pi));
  }

  update(_t,dt){
    this.bgTimer+=dt;
    if(this.bgTimer>120){ this.bgTimer=0; this.drawBg(); }

    this.floats=this.floats.filter(f=>{
      f.y-=1.2*(dt/16); f.alpha-=0.012*(dt/16);
      f.txt.setPosition(f.x,f.y).setAlpha(Math.max(0,f.alpha));
      if(f.alpha<=0){ f.txt.destroy(); return false; }
      return true;
    });

    if(this.camShake>0){
      this.camShake=Math.max(0,this.camShake-0.3*(dt/16));
      this.cameras.main.setScroll((Math.random()-0.5)*this.camShake,(Math.random()-0.5)*this.camShake);
    } else {
      this.cameras.main.setScroll(0,0);
    }

    this.robs.forEach((rob,pi)=>{
      if(!rob.launching||rob.gone) return;
      rob.vy-=0.45*(dt/16);
      rob.offsetY+=rob.vy*(dt/16);
      rob.shakeX=(Math.random()-0.5)*3;
      rob.exTimer+=dt;
      rob.flashT+=dt;
      if(rob.flashT>200){ rob.flashT=0; rob.flashOn=!rob.flashOn; }
      this.drawRobot(pi);
      this.drawExhaust(pi);
      if(rob.offsetY<-this.scale.height*0.65){
        rob.gone=true; rob.launching=false;
        rob.gfx.clear(); rob.exGfx.clear();
        this.checkWin();
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  colCX(pi){ const cw=this.scale.width/GS.N; return cw*pi+cw/2; }
  get gY(){ return this.scale.height-55; }

  drawAll(){
    this.drawBg(); this.drawGround(); this.drawPads();
    this.robs.forEach((_,pi)=>this.drawRobot(pi));
  }

  // ── Background ───────────────────────────────────────────────
  drawBg(){
    const g=this.bgG, W=this.scale.width, H=this.scale.height;
    g.clear();
    g.fillGradientStyle(0x000010,0x000010,0x080828,0x080828,1);
    g.fillRect(0,0,W,H);
    const mx=W*0.87, my=H*0.1;
    g.fillStyle(0xfffde0,0.06); g.fillCircle(mx,my,50);
    g.fillStyle(0xfffde0,0.9);  g.fillCircle(mx,my,25);
    g.fillStyle(0xd8c890,0.5);  g.fillCircle(mx-7,my-4,5);
    g.fillStyle(0xd8c890,0.4);  g.fillCircle(mx+9,my+7,3.5);
    g.fillStyle(0x2244aa,0.04); g.fillEllipse(W*0.25,H*0.22,220,90);
    g.fillStyle(0x442288,0.03); g.fillEllipse(W*0.65,H*0.3,180,70);
    g.fillStyle(0x224488,0.025);g.fillEllipse(W*0.5,H*0.15,150,50);
    const t=Date.now()*0.001;
    this.stars.forEach(s=>{
      const a=0.3+0.7*Math.abs(Math.sin(t/s.sp+s.ph));
      g.fillStyle(0xffffff,a); g.fillCircle(s.x,s.y,s.r);
    });
  }

  // ── Ground ───────────────────────────────────────────────────
  drawGround(){
    const g=this.gndG, W=this.scale.width, H=this.scale.height, gY=this.gY;
    g.clear();
    g.fillGradientStyle(0x1a3a1a,0x1a3a1a,0x0d200d,0x0d200d,1);
    g.fillRect(0,gY,W,H-gY);
    g.lineStyle(2,0x44aa44,0.6); g.beginPath(); g.moveTo(0,gY); g.lineTo(W,gY); g.strokePath();
    g.lineStyle(1,0x88ff88,0.2); g.beginPath(); g.moveTo(0,gY-1); g.lineTo(W,gY-1); g.strokePath();
    g.lineStyle(1,0x224422,0.25);
    for(let x=0;x<W;x+=40){ g.beginPath(); g.moveTo(x,gY); g.lineTo(x,H); g.strokePath(); }
  }

  // ── Launch pads ──────────────────────────────────────────────
  drawPads(){
    const g=this.padG, gY=this.gY;
    g.clear();
    GS.players.forEach((p,pi)=>{
      const cx=this.colCX(pi), c=p.color.hex;
      g.fillStyle(c,0.07); g.fillEllipse(cx,gY,130,22);
      g.fillStyle(0x2a2a3a,1); g.fillRect(cx-40,gY-9,80,9);
      g.fillStyle(c,0.8); g.fillRect(cx-36,gY-11,72,4);
      g.fillStyle(0xffffff,0.3);
      for(let i=-3;i<=3;i+=2) g.fillRect(cx+i*9-3,gY-11,6,4);
      g.lineStyle(4,0x444455,1);
      g.beginPath(); g.moveTo(cx-28,gY-9); g.lineTo(cx-40,gY); g.strokePath();
      g.beginPath(); g.moveTo(cx+28,gY-9); g.lineTo(cx+40,gY); g.strokePath();
      g.fillStyle(0x111122,1); g.fillEllipse(cx,gY-2,32,9);
      g.fillStyle(c,0.15);     g.fillEllipse(cx,gY-2,28,7);
    });
  }

  // ── Add robot part ────────────────────────────────────────────
  addPart(pi,partIdx){
    const rob=this.robs[pi];
    const partName=PART_NAMES[partIdx];
    // Only add each part once (multiple items may map to same part)
    if(!rob.parts.includes(partName)) rob.parts.push(partName);
    SFX.part();
    this.drawRobot(pi);
    const cx=this.colCX(pi);
    const baseY=this.gY+rob.offsetY;
    const label=PART_LABELS[partIdx];
    const txt=this.add.text(cx,baseY-150,`+ ${label}`,{
      fontSize:'14px', color:GS.players[pi].color.css,
      stroke:'#000000', strokeThickness:3, fontStyle:'bold',
    }).setDepth(30).setOrigin(0.5,0.5);
    this.floats.push({txt,x:cx,y:baseY-150,alpha:1.0});
    this.camShake=Math.max(this.camShake,2);
  }

  // ── Draw robot ────────────────────────────────────────────────
  drawRobot(pi){
    const rob=this.robs[pi];
    if(rob.gone){ rob.gfx.clear(); return; }
    const g=rob.gfx; g.clear();
    if(rob.parts.length===0) return;

    const W=this.scale.width;
    const cx=this.colCX(pi)+rob.shakeX;
    const baseY=this.gY+rob.offsetY;
    const col=GS.players[pi].color.hex;
    const flash=rob.flashOn&&rob.launching;
    const colW=W/GS.N;
    const sc=Math.min(1.0,colW/200,(this.scale.height*0.55)/220);
    const s=v=>v*sc;

    const darker=(hex,amt)=>{
      const r=Math.max(0,((hex>>16)&0xff)-amt);
      const gr=Math.max(0,((hex>>8)&0xff)-amt);
      const b=Math.max(0,(hex&0xff)-amt);
      return (r<<16)|(gr<<8)|b;
    };
    const dark=darker(col,60);
    const has=name=>rob.parts.includes(name);

    // ── Left Foot ──────────────────────────────────────────
    if(has('lFoot')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(30),baseY-s(8), s(24),s(8), s(3));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(28),baseY-s(10),s(22),s(8), s(3));
      g.fillStyle(0x222233,0.8); g.fillRect(cx-s(27),baseY-s(3),s(20),s(2));
    }
    // ── Right Foot ─────────────────────────────────────────
    if(has('rFoot')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx+s(6), baseY-s(8), s(24),s(8), s(3));
      g.fillStyle(col,1);        g.fillRoundedRect(cx+s(6), baseY-s(10),s(22),s(8), s(3));
      g.fillStyle(0x222233,0.8); g.fillRect(cx+s(7),baseY-s(3),s(20),s(2));
    }
    // ── Left Leg ───────────────────────────────────────────
    if(has('lLeg')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(27),baseY-s(48),s(20),s(40),s(5));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(25),baseY-s(50),s(18),s(40),s(5));
      g.fillStyle(0xffffff,0.15);g.fillCircle(cx-s(16),baseY-s(30),s(7));
      g.fillStyle(col,1);        g.fillCircle(cx-s(16),baseY-s(30),s(5));
      g.fillStyle(dark,0.5);     g.fillCircle(cx-s(16),baseY-s(30),s(2));
    }
    // ── Right Leg ──────────────────────────────────────────
    if(has('rLeg')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx+s(7), baseY-s(48),s(20),s(40),s(5));
      g.fillStyle(col,1);        g.fillRoundedRect(cx+s(7), baseY-s(50),s(18),s(40),s(5));
      g.fillStyle(0xffffff,0.15);g.fillCircle(cx+s(16),baseY-s(30),s(7));
      g.fillStyle(col,1);        g.fillCircle(cx+s(16),baseY-s(30),s(5));
      g.fillStyle(dark,0.5);     g.fillCircle(cx+s(16),baseY-s(30),s(2));
    }
    // ── Torso ──────────────────────────────────────────────
    if(has('torso')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(30),baseY-s(102),s(60),s(58),s(9));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(28),baseY-s(104),s(56),s(58),s(9));
      g.fillStyle(0x111122,0.75);g.fillRoundedRect(cx-s(17),baseY-s(94), s(34),s(30),s(5));
      const lc=[0xff4444,0x44ff44,0x4444ff,0xffff44];
      lc.forEach((c2,i)=>{
        g.fillStyle(c2,flash?1.0:0.7); g.fillCircle(cx-s(10)+i*s(7),baseY-s(84),s(3.5));
        if(flash){ g.fillStyle(c2,0.3); g.fillCircle(cx-s(10)+i*s(7),baseY-s(84),s(6)); }
      });
      g.fillStyle(0xffffff,0.12); g.fillCircle(cx,baseY-s(58),s(8));
      g.fillStyle(col,0.8);       g.fillCircle(cx,baseY-s(58),s(5));
      g.fillStyle(dark,1);        g.fillCircle(cx-s(28),baseY-s(90),s(8));
      g.fillStyle(col,0.9);       g.fillCircle(cx-s(28),baseY-s(90),s(6));
      g.fillStyle(dark,1);        g.fillCircle(cx+s(28),baseY-s(90),s(8));
      g.fillStyle(col,0.9);       g.fillCircle(cx+s(28),baseY-s(90),s(6));
      g.fillStyle(dark,1);        g.fillCircle(cx-s(16),baseY-s(50),s(7));
      g.fillStyle(col,0.9);       g.fillCircle(cx-s(16),baseY-s(50),s(5));
      g.fillStyle(dark,1);        g.fillCircle(cx+s(16),baseY-s(50),s(7));
      g.fillStyle(col,0.9);       g.fillCircle(cx+s(16),baseY-s(50),s(5));
    }
    // ── Left Arm ───────────────────────────────────────────
    if(has('lArm')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(48),baseY-s(102),s(20),s(36),s(5));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(46),baseY-s(104),s(18),s(36),s(5));
      g.fillStyle(0xffffff,0.15);g.fillCircle(cx-s(37),baseY-s(72),s(6));
      g.fillStyle(col,1);        g.fillCircle(cx-s(37),baseY-s(72),s(4));
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(46),baseY-s(72),s(16),s(28),s(4));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(44),baseY-s(74),s(14),s(28),s(4));
      g.fillStyle(dark,1);       g.fillCircle(cx-s(37),baseY-s(48),s(8));
      g.fillStyle(col,1);        g.fillCircle(cx-s(37),baseY-s(48),s(6));
    }
    // ── Right Arm ──────────────────────────────────────────
    if(has('rArm')){
      g.fillStyle(dark,1);       g.fillRoundedRect(cx+s(28),baseY-s(102),s(20),s(36),s(5));
      g.fillStyle(col,1);        g.fillRoundedRect(cx+s(28),baseY-s(104),s(18),s(36),s(5));
      g.fillStyle(0xffffff,0.15);g.fillCircle(cx+s(37),baseY-s(72),s(6));
      g.fillStyle(col,1);        g.fillCircle(cx+s(37),baseY-s(72),s(4));
      g.fillStyle(dark,1);       g.fillRoundedRect(cx+s(30),baseY-s(72),s(16),s(28),s(4));
      g.fillStyle(col,1);        g.fillRoundedRect(cx+s(30),baseY-s(74),s(14),s(28),s(4));
      g.fillStyle(dark,1);       g.fillCircle(cx+s(37),baseY-s(48),s(8));
      g.fillStyle(col,1);        g.fillCircle(cx+s(37),baseY-s(48),s(6));
    }
    // ── Head ───────────────────────────────────────────────
    if(has('head')){
      // Neck
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(10),baseY-s(116),s(20),s(16),s(4));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(8), baseY-s(118),s(16),s(16),s(4));
      // Head
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(26),baseY-s(152),s(52),s(40),s(10));
      g.fillStyle(col,1);        g.fillRoundedRect(cx-s(24),baseY-s(154),s(48),s(40),s(10));
      // Visor
      g.fillStyle(0x001133,0.9); g.fillRoundedRect(cx-s(18),baseY-s(148),s(36),s(22),s(6));
      g.fillStyle(0x0044ff,0.3); g.fillRoundedRect(cx-s(16),baseY-s(146),s(32),s(18),s(5));
      // Visor shine
      g.fillStyle(0xffffff,0.2); g.fillRoundedRect(cx-s(14),baseY-s(144),s(12),s(6),s(3));
      // Eyes (LEDs inside visor)
      g.fillStyle(flash?0xffffff:0x00ffff,flash?1:0.8);
      g.fillCircle(cx-s(8),baseY-s(138),s(4));
      g.fillCircle(cx+s(8),baseY-s(138),s(4));
      if(flash){
        g.fillStyle(0x00ffff,0.3);
        g.fillCircle(cx-s(8),baseY-s(138),s(7));
        g.fillCircle(cx+s(8),baseY-s(138),s(7));
      }
      // Ear bolts
      g.fillStyle(dark,1);  g.fillCircle(cx-s(24),baseY-s(134),s(5));
      g.fillStyle(col,0.9); g.fillCircle(cx-s(24),baseY-s(134),s(3));
      g.fillStyle(dark,1);  g.fillCircle(cx+s(24),baseY-s(134),s(5));
      g.fillStyle(col,0.9); g.fillCircle(cx+s(24),baseY-s(134),s(3));
    }
    // ── Rocket Pack ────────────────────────────────────────
    if(has('pack')){
      // Main pack body
      g.fillStyle(dark,1);       g.fillRoundedRect(cx-s(22),baseY-s(108),s(44),s(30),s(6));
      g.fillStyle(0xaaaacc,1);   g.fillRoundedRect(cx-s(20),baseY-s(110),s(40),s(30),s(6));
      // Nozzles (3)
      const nozzleX=[cx-s(14),cx,cx+s(14)];
      nozzleX.forEach(nx=>{
        g.fillStyle(0x333344,1); g.fillRoundedRect(nx-s(5),baseY-s(82),s(10),s(14),s(3));
        g.fillStyle(0x555566,1); g.fillRoundedRect(nx-s(4),baseY-s(80),s(8), s(12),s(3));
        // Flame (always visible when pack is on)
        const fc=flash?0xffffff:0xff6600;
        g.fillStyle(fc,0.9);     g.fillTriangle(nx-s(4),baseY-s(68),nx+s(4),baseY-s(68),nx,baseY-s(58));
        g.fillStyle(0xffff00,0.6);g.fillTriangle(nx-s(2),baseY-s(68),nx+s(2),baseY-s(68),nx,baseY-s(62));
      });
      // Pack detail lines
      g.lineStyle(1,0x888899,0.5);
      g.beginPath(); g.moveTo(cx-s(18),baseY-s(100)); g.lineTo(cx+s(18),baseY-s(100)); g.strokePath();
      g.beginPath(); g.moveTo(cx-s(18),baseY-s(94));  g.lineTo(cx+s(18),baseY-s(94));  g.strokePath();
      // Antenna on head
      if(has('head')){
        g.fillStyle(0x888899,1); g.fillRect(cx-s(2),baseY-s(168),s(4),s(16));
        g.fillStyle(flash?0xff4444:0xff0000,1); g.fillCircle(cx,baseY-s(170),s(5));
        if(flash){ g.fillStyle(0xff0000,0.4); g.fillCircle(cx,baseY-s(170),s(9)); }
      }
    }
  }

  // ── Draw exhaust flames ───────────────────────────────────────
  drawExhaust(pi){
    const rob=this.robs[pi];
    if(!rob.launching||rob.gone){ rob.exGfx.clear(); return; }
    const g=rob.exGfx; g.clear();
    const cx=this.colCX(pi)+rob.shakeX;
    const baseY=this.gY+rob.offsetY;
    const W=this.scale.width;
    const colW=W/GS.N;
    const sc=Math.min(1.0,colW/200,(this.scale.height*0.55)/220);
    const s=v=>v*sc;
    const t=rob.exTimer*0.01;

    // Main exhaust plume from rocket pack nozzles
    const nozzleX=[cx-s(14),cx,cx+s(14)];
    nozzleX.forEach((nx,i)=>{
      const flicker=0.7+0.3*Math.sin(t*7+i*2.1);
      const len=s(40+20*Math.sin(t*5+i));
      // Outer flame (orange)
      g.fillStyle(0xff4400,0.5*flicker);
      g.fillTriangle(nx-s(7),baseY-s(68),nx+s(7),baseY-s(68),nx,baseY-s(68)+len);
      // Mid flame (yellow)
      g.fillStyle(0xffaa00,0.6*flicker);
      g.fillTriangle(nx-s(4),baseY-s(68),nx+s(4),baseY-s(68),nx,baseY-s(68)+len*0.7);
      // Core (white)
      g.fillStyle(0xffffff,0.7*flicker);
      g.fillTriangle(nx-s(2),baseY-s(68),nx+s(2),baseY-s(68),nx,baseY-s(68)+len*0.4);
    });

    // Ground blast (only near ground)
    const groundThresh=80*sc;
    if(rob.offsetY>-groundThresh){
      const spread=s(50+20*Math.sin(t*3));
      const alpha=Math.max(0,0.6*(1-Math.abs(rob.offsetY)/groundThresh));
      g.fillStyle(0xff6600,alpha*0.4); g.fillEllipse(cx,this.gY,spread*2,s(20));
      g.fillStyle(0xffaa00,alpha*0.3); g.fillEllipse(cx,this.gY,spread*1.4,s(12));
      g.fillStyle(0xffffff,alpha*0.2); g.fillEllipse(cx,this.gY,spread*0.6,s(6));
    }
  }

  // ── Launch sequence ───────────────────────────────────────────
  doLaunch(pi){
    const rob=this.robs[pi];
    this.camShake=6;
    // Countdown then lift off
    let countdown=3;
    const tick=()=>{
      if(countdown>0){
        const cx=this.colCX(pi);
        const txt=this.add.text(cx,this.gY-80,`${countdown}`,{
          fontSize:'52px', color:'#ffff00',
          stroke:'#000000', strokeThickness:5, fontStyle:'bold',
        }).setDepth(40).setOrigin(0.5,0.5);
        this.tweens.add({targets:txt,alpha:0,scaleX:2.5,scaleY:2.5,duration:850,onComplete:()=>txt.destroy()});
        countdown--;
        this.time.delayedCall(950,tick);
      } else {
        // LIFTOFF
        SFX.launch();
        rob.launching=true;
        rob.vy=0;
        this.camShake=14;
        const cx=this.colCX(pi);
        const txt=this.add.text(cx,this.gY-80,'LIFTOFF!',{
          fontSize:'36px', color:'#ff8800',
          stroke:'#000000', strokeThickness:4, fontStyle:'bold',
        }).setDepth(40).setOrigin(0.5,0.5);
        this.tweens.add({targets:txt,alpha:0,y:this.gY-160,duration:1200,onComplete:()=>txt.destroy()});
      }
    };
    tick();
  }

  // ── Check win condition ───────────────────────────────────────
  checkWin(){
    // Show win when any finished player's rocket has gone off screen
    SFX.win();
    const wb=document.getElementById('wb');
    wb.classList.add('on');
    this.spawnFireworks();
    // Keep fireworks going for a while
    this.time.delayedCall(500,()=>this.spawnFireworks());
    this.time.delayedCall(1200,()=>this.spawnFireworks());
    this.time.delayedCall(2000,()=>this.spawnFireworks());
    setTimeout(()=>wb.classList.remove('on'),6000);
  }

  // ── Fireworks ─────────────────────────────────────────────────
  spawnFireworks(){
    const W=this.scale.width, H=this.scale.height;
    const colors=[0xff4444,0x44ff44,0x4444ff,0xffff44,0xff44ff,0x44ffff,0xffffff,0xff8800];
    let count=0;
    const burst=()=>{
      if(count>=12) return;
      count++;
      const x=Phaser.Math.Between(W*0.1,W*0.9);
      const y=Phaser.Math.Between(H*0.05,H*0.65);
      const col=colors[Math.floor(Math.random()*colors.length)];
      const g=this.add.graphics().setDepth(25);
      const numP=Phaser.Math.Between(16,28);
      const particles=Array.from({length:numP},()=>({
        angle:Math.random()*Math.PI*2,
        speed:Math.random()*5+2,
        x,y,alpha:1,trail:[],
      }));
      let life=0;
      const maxLife=50;
      const timer=this.time.addEvent({delay:16,repeat:maxLife,callback:()=>{
        life++;
        g.clear();
        particles.forEach(p=>{
          p.trail.push({x:p.x,y:p.y});
          if(p.trail.length>5) p.trail.shift();
          p.x+=Math.cos(p.angle)*p.speed*(1-life/maxLife);
          p.y+=Math.sin(p.angle)*p.speed*(1-life/maxLife)+0.08*life;
          p.alpha=Math.max(0,1-life/maxLife);
          // Trail
          p.trail.forEach((pt,ti)=>{
            const ta=p.alpha*(ti/p.trail.length)*0.4;
            g.fillStyle(col,ta); g.fillCircle(pt.x,pt.y,2);
          });
          // Head
          g.fillStyle(col,p.alpha); g.fillCircle(p.x,p.y,3.5);
          g.fillStyle(0xffffff,p.alpha*0.6); g.fillCircle(p.x,p.y,1.5);
        });
        if(life>=maxLife){ g.destroy(); timer.remove(); }
      }});
      // Schedule next burst
      this.time.delayedCall(Phaser.Math.Between(150,400),burst);
    };
    // Start several bursts
    for(let i=0;i<3;i++) this.time.delayedCall(i*120,burst);
  }
}
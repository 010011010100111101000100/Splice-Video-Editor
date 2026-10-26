const F=n=>440*2**((n-69)/12);
const NAMES={piano:'Grand piano',epiano:'Electric piano',guitar:'Acoustic guitar',bass:'Bass guitar',strings:'Violin section',flute:'Flute',marimba:'Marimba',synth:'Synth lead',drums:'Drum kit'};
const PADS=['Kick','Snare','Hi-hat','Open hat','Tom','Low tom','Clap','Crash'];
const nz=new WeakMap();
const noiseBuf=c=>{
  if(!nz.has(c)){const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;nz.set(c,b)}
  return nz.get(c);
};
function mkVoice(c,out){
  const g=c.createGain(),o=[];g.connect(out);
  return{g,o,
    osc(type,f,t){const x=c.createOscillator();x.type=type;x.frequency.setValueAtTime(f,t);o.push(x);x.start(t);return x},
    rel(t,r){g.gain.setTargetAtTime(0,t,r/3);o.forEach(x=>x.stop(t+r*2+.1))}
  };
}
function decay(c,V,x,a,d,t,dest){
  const g=c.createGain();g.gain.setValueAtTime(a,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);x.connect(g);g.connect(dest||V.g);
}
function ks(c,f,v,damp,br,dur){
  const sr=c.sampleRate,N=Math.max(2,Math.ceil(sr/f-.5)),fa=sr/(N+.5),n=sr*dur|0,b=c.createBuffer(1,n,sr),d=b.getChannelData(0),w=new Float32Array(N);
  let s=0,m=0;
  for(let i=0;i<N;i++){s+=(Math.random()*2-1-s)*br;w[i]=s;m=Math.max(m,Math.abs(s))}
  for(let i=0;i<N;i++)w[i]*=v/m;
  for(let i=0,p=0;i<n;i++){const a=w[p];d[i]=a;w[p]=damp*.5*(a+w[(p+1)%N]);p=(p+1)%N}
  return{b,rate:f/fa};
}
const pluck=(damp,br,dur,lp,gain,relT)=>(c,o,f,t,v)=>{
  const V=mkVoice(c,o),k=ks(c,f,v,damp,br,dur),s=c.createBufferSource(),l=c.createBiquadFilter();
  s.buffer=k.b;s.playbackRate.value=k.rate;l.frequency.value=lp;s.connect(l);l.connect(V.g);V.g.gain.value=gain;V.o.push(s);s.start(t);
  return r=>V.rel(r,relT);
};
function hit(c,o,k,t,v){
  const N=(d,type,fr,q,a,dt=0)=>{
    const s=c.createBufferSource(),b=c.createBiquadFilter(),h=c.createGain();
    s.buffer=noiseBuf(c);b.type=type;b.frequency.value=fr;b.Q.value=q;h.gain.setValueAtTime(a*v,t+dt);h.gain.exponentialRampToValueAtTime(.0001,t+dt+d);
    s.connect(b);b.connect(h);h.connect(o);s.start(t+dt);s.stop(t+dt+d+.05);
  };
  const T=(f1,f2,d,a)=>{
    const x=c.createOscillator(),h=c.createGain();
    x.frequency.setValueAtTime(f1,t);x.frequency.exponentialRampToValueAtTime(f2,t+d);h.gain.setValueAtTime(a*v,t);h.gain.exponentialRampToValueAtTime(.0001,t+d);
    x.connect(h);h.connect(o);x.start(t);x.stop(t+d+.05);
  };
  if(k===0){T(150,45,.4,1.1);N(.02,'highpass',2500,1,.3)}
  else if(k===1){T(220,120,.12,.5);N(.2,'highpass',1500,.7,.8)}
  else if(k===2)N(.05,'highpass',8000,1,.5);
  else if(k===3)N(.4,'highpass',7000,1,.45);
  else if(k===4)T(200,90,.3,.9);
  else if(k===5)T(130,60,.45,.9);
  else if(k===6)[0,.012,.024,.036].forEach((d,i)=>N(i<3?.02:.18,'bandpass',1200,.8,.8,d));
  else{N(1.6,'highpass',4000,1,.45);N(1.2,'bandpass',9000,.5,.3)}
}
const INST={
  piano:(c,o,f,t,v)=>{
    const V=mkVoice(c,o),l=c.createBiquadFilter();
    l.frequency.value=800+v*6000;l.connect(V.g);
    for(let k=1;k<=7;k++)decay(c,V,V.osc('sine',f*k*Math.sqrt(1+4e-4*k*k),t),v*.5/k**1.1,Math.max(.4,6*(262/f)**.6/(1+.6*(k-1))),t,l);
    const n=c.createBufferSource(),nf=c.createBiquadFilter();
    n.buffer=noiseBuf(c);nf.frequency.value=1800;n.connect(nf);decay(c,V,nf,v*.15,.03,t);n.start(t);n.stop(t+.05);
    return r=>V.rel(r,.3);
  },
  epiano:(c,o,f,t,v)=>{
    const V=mkVoice(c,o),m=V.osc('sine',f,t),mg=c.createGain(),x=V.osc('sine',f,t),p=c.createGain();
    mg.gain.setValueAtTime(f*(1+v*2),t);mg.gain.exponentialRampToValueAtTime(f*.05,t+1.2);m.connect(mg);mg.connect(x.frequency);
    p.gain.setValueAtTime(v*.7,t);p.gain.exponentialRampToValueAtTime(v*.15,t+2.5);x.connect(p);p.connect(V.g);
    decay(c,V,V.osc('sine',f*7,t),v*.1,.15,t);
    return r=>V.rel(r,.3);
  },
  guitar:pluck(.9965,.45,3,3500,1.1,.3),
  bass:pluck(.998,.2,4,700,1.6,.25),
  strings:(c,o,f,t,v)=>{
    const V=mkVoice(c,o),l=c.createBiquadFilter(),lfo=c.createOscillator(),lg=c.createGain();
    l.frequency.value=2200+v*1500;l.connect(V.g);lfo.frequency.value=5.5;lg.gain.value=f*.006;lfo.connect(lg);lfo.start(t);V.o.push(lfo);
    [-6,6].forEach(d=>{const x=V.osc('sawtooth',f,t);x.detune.value=d;lg.connect(x.frequency);x.connect(l)});
    V.g.gain.setValueAtTime(0,t);V.g.gain.linearRampToValueAtTime(.35*v+.1,t+.15);
    return r=>V.rel(r,.35);
  },
  flute:(c,o,f,t,v)=>{
    const V=mkVoice(c,o);
    [[1,1],[2,.25],[3,.08]].forEach(([k,a])=>{const x=V.osc('sine',f*k,t),g=c.createGain();g.gain.value=a;x.connect(g);g.connect(V.g)});
    const n=c.createBufferSource(),b=c.createBiquadFilter(),ng=c.createGain();
    n.buffer=noiseBuf(c);n.loop=true;b.type='bandpass';b.frequency.value=f*2;b.Q.value=2;ng.gain.value=.12;n.connect(b);b.connect(ng);ng.connect(V.g);n.start(t);V.o.push(n);
    V.g.gain.setValueAtTime(0,t);V.g.gain.linearRampToValueAtTime(.4*v+.1,t+.08);
    return r=>V.rel(r,.12);
  },
  marimba:(c,o,f,t,v)=>{
    const V=mkVoice(c,o);
    [[1,1,1.1],[4,.35,.3],[10,.12,.08]].forEach(([k,a,d])=>decay(c,V,V.osc('sine',f*k,t),a*v*.8,d,t));
    return r=>V.rel(r,.1);
  },
  synth:(c,o,f,t,v)=>{
    const V=mkVoice(c,o),l=c.createBiquadFilter();
    l.Q.value=4;l.frequency.setValueAtTime(400,t);l.frequency.linearRampToValueAtTime(3500,t+.15);l.frequency.exponentialRampToValueAtTime(1200,t+.8);l.connect(V.g);
    [-8,8].forEach(d=>{const x=V.osc('sawtooth',f,t);x.detune.value=d;x.connect(l)});
    V.g.gain.value=.25*v+.05;
    return r=>V.rel(r,.2);
  },
  drums:(c,o,f,t,v,i)=>{hit(c,o,i,t,v);return()=>{}}
};

const FX2={
  Laser:h=>h.tone('sawtooth',1800,0,.35,.5,6000,200),
  Coin:h=>{h.tone('square',988,0,.08,.3,6000);h.tone('square',1319,.08,.6,.3,6000)},
  'Power up':h=>[0,1,2,3,4].forEach(i=>h.tone('square',NOTE(60+i*4),i*.07,.12,.25,5000)),
  Riser:h=>{h.tone('sawtooth',100,0,3.5,.2,4000,1600);h.noise(0,3.5,.5,1000,2.8)},
  Impact:h=>{h.tone('sine',100,0,1.5,1,400,30);h.noise(0,.4,.7,200)},
  Camera:h=>{h.noise(0,.03,.8,2000);h.noise(.08,.05,.6,1200)},
  Applause:h=>{for(let i=0;i<40;i++)h.noise(Math.random()*2.5,.05,.15+Math.random()*.2,1500+Math.random()*3000)},
  Heartbeat:h=>[0,.18,.9,1.08].forEach((s,i)=>h.tone('sine',70,s,.18,i%2?.6:1,200,40)),
  Chime:h=>[880,1175,1568].forEach((f,i)=>h.tone('sine',f,i*.12,1.2,.35)),
  Siren:h=>[0,.6,1.2,1.8].forEach((s,i)=>h.tone('sawtooth',i%2?1000:650,s,.6,.25,2500,i%2?650:1000)),
  Explosion:h=>{h.noise(0,2.5,.9,60,.01);h.tone('sine',80,0,2,1,300,25)},
  Click:h=>h.tone('square',2000,0,.04,.4,8000)
};
const sfx0=sfx;
sfx=async n=>{
  if(!FX2[n])return sfx0(n);
  const o=new OfflineAudioContext(1,SR*4,SR);
  FX2[n](mk(o));
  return wav(await o.startRendering());
};
const base=SFX.length;
Object.keys(FX2).forEach(n=>SFX.push(n));
document.querySelectorAll('aside .grid')[2].insertAdjacentHTML('beforeend',Object.keys(FX2).map((n,i)=>`<button data-lib="s${base+i}">${n}</button>`).join(''));

const lanes={o:1,a:1},act={o:0,a:0},names={};
const laneName=(tr,l)=>names[tr+l]||(tr==='v'?'Video':(tr==='o'?'Text bar ':'Audio bar ')+(l+1));
renderTL=function(){
  const W=Math.max(total+15,30)*pps,step=pps>=100?1:pps>=40?5:10,rows=[];
  let h='<div class="ruler">';
  for(let s=0;s<W/pps;s+=step)h+=`<div class="tick" style="left:${s*pps}px">${fmt(s).replace('.0','')}</div>`;
  h+='</div>';
  for(let l=0;l<lanes.o;l++)rows.push(['o',l]);
  rows.push(['v',0]);
  for(let l=0;l<lanes.a;l++)rows.push(['a',l]);
  for(const[tr,l]of rows){
    h+=`<div class="row"><span class="rl${tr!=='v'&&act[tr]===l?' on':''}" data-tr="${tr}" data-l="${l}">${laneName(tr,l)}</span>`;
    for(const c of clips.filter(c=>c.track===tr&&(c.lane||0)===l))
      h+=`<div class="clip ${tr}${c.id===sel?' sel':''}" data-id="${c.id}" style="left:${c.start*pps}px;width:${Math.max(14,len(c)*pps)}px"><div class="h l" data-h="l"></div>${wave(c)}${mediaOf(c).name}<i>${fmt(len(c))}${c.speed!==1?' · '+c.speed+'x':''}</i><div class="h r" data-h="r"></div></div>`;
    h+='</div>';
  }
  $('#tl').style.width=W+'px';
  $('#tl').innerHTML=h+'<div id="ph"></div>';
};
const addClip0=addClip,addOv0=addOv;
addClip=(m,tr)=>{addClip0(m,tr);clips[clips.length-1].lane=act[tr]||0;renderTL()};
addOv=o=>addOv0({...o,lane:act.o});
$('#tl').addEventListener('click',e=>{
  const r=e.target.closest('.rl');if(!r||r.dataset.tr==='v')return;
  act[r.dataset.tr]=+r.dataset.l;renderTL();
});
$('#tl').addEventListener('dblclick',e=>{
  const r=e.target.closest('.rl');if(!r)return;
  const n=prompt('Name this bar',laneName(r.dataset.tr,+r.dataset.l));
  if(n){names[r.dataset.tr+r.dataset.l]=n.slice(0,20);renderTL()}
});

let cine=false,guide=true;
const draw1=draw;
draw=()=>{
  draw1();
  const W=cv.width,H=cv.height;
  if(cine&&W>H){const b=(H-W/2.39)/2;cx.fillStyle='#000';cx.fillRect(0,0,W,b);cx.fillRect(0,H-b,W,b)}
  if(H>W&&guide&&!exporting){
    cx.save();cx.strokeStyle='rgba(255,255,255,.6)';cx.setLineDash([10,8]);cx.lineWidth=3;cx.strokeRect(W*.04,H*.08,W*.76,H*.62);
    cx.fillStyle='rgba(255,255,255,.75)';cx.font=`${W/32}px sans-serif`;cx.fillText('Keep text and faces inside the box',W*.05,H*.08-12);cx.restore();
  }
};
const ratio=$('#ratio');
const syncMode=()=>{
  const v=cv.height>cv.width;
  $('#stage').classList.toggle('short',v);
  $('#mShort').classList.toggle('pri',v);$('#mMovie').classList.toggle('pri',!v);
};
ratio.addEventListener('change',syncMode);
const setMode=v=>{ratio.value=v?'720x1280':'1280x720';ratio.dispatchEvent(new Event('change'));ratio.onchange({target:ratio})};
$('#exp').insertAdjacentHTML('beforebegin','<button id="mMovie" class="pri">Movie</button><button id="mShort">Short</button><button id="cine">Cinema bars</button><button id="guide">Shorts guide</button><button id="instBtn">Instruments</button>');
$('#mMovie').onclick=()=>setMode(0);
$('#mShort').onclick=()=>setMode(1);
$('#cine').onclick=()=>{cine=!cine;$('#cine').classList.toggle('pri',cine)};
$('#guide').onclick=()=>{guide=!guide;$('#guide').classList.toggle('pri',guide)};
$('#guide').classList.add('pri');
$('#exp').addEventListener('click',e=>{
  if(cv.height>cv.width&&total>180&&!confirm('YouTube Shorts are limited to 3 minutes. Export anyway?'))e.stopImmediatePropagation();
},true);

document.head.insertAdjacentHTML('beforeend',`<style>
#tlwrap{grid-template-columns:1fr}#labels{display:none}
.rl{position:sticky;left:4px;top:2px;display:inline-block;z-index:4;background:rgba(23,27,38,.85);padding:1px 9px;border-radius:10px;font-size:11px;color:var(--mut);cursor:pointer;margin:3px 0 0 4px;border:1px solid var(--line)}
.rl.on{color:#0c1a19;background:var(--ac);border-color:var(--ac)}
#stage.short #cv{border-radius:24px;box-shadow:0 0 0 6px #000,0 0 0 8px var(--line)}
#inst{display:none;position:fixed;left:50%;bottom:262px;transform:translateX(-50%);width:min(96vw,580px);background:var(--panel);border:1px solid var(--ac);border-radius:12px;padding:12px;z-index:20}
#inst.on{display:block}
.ih{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.ih label{color:var(--mut);font-size:12px}
.keys{position:relative;display:flex;height:120px;width:532px;max-width:100%;user-select:none;touch-action:none}
.wk{flex:0 0 38px;background:#f2f2f2;border:1px solid #888;border-radius:0 0 5px 5px}
.bk{position:absolute;top:0;width:26px;height:74px;background:#111;border-radius:0 0 4px 4px;z-index:2}
.dn{background:var(--ac)!important}
.pads{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%}
.pad{height:56px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;text-align:center}
</style>`);
$('aside').insertAdjacentHTML('beforeend','<details open><summary>Bars</summary><div class="grid"><button class="wide" id="addO">+ New text bar</button><button class="wide" id="addA">+ New audio bar</button></div><p class="hint" style="font-size:12px">Click a bar name to add new items to it. Double-click to rename.</p></details>');
$('#addO').onclick=()=>{act.o=lanes.o++;renderTL()};
$('#addA').onclick=()=>{act.a=lanes.a++;renderTL()};

const P=document.createElement('div');
P.id='inst';
P.innerHTML=`<div class="ih"><select id="isel">${Object.keys(NAMES).map(k=>`<option value="${k}">${NAMES[k]}</option>`).join('')}</select>
<button id="om">Octave −</button><span id="ol">4</span><button id="op">Octave +</button>
<label><input type="checkbox" id="along" checked> Play timeline while recording</label>
<button class="pri" id="rec">● Record</button><button id="xi">Close</button></div><div id="keys"></div><p class="hint" id="ist" style="font-size:12px;margin:8px 0 0">Click the keys or type on your keyboard: A W S E D F T G Y H U J K O L P ;</p>`;
document.body.appendChild(P);
let oct=4,rec=null,instOut=null;
const held={},KM='awsedftgyhujkolp;',W7=new Set([0,2,4,5,7,9,11]);
function buildKeys(){
  const drum=$('#isel').value==='drums';
  let h='',wi=0;
  if(drum)h='<div class="pads">'+PADS.map((n,i)=>`<div class="pad" data-n="${i}">${n}<br>(${KM[i].toUpperCase()})</div>`).join('')+'</div>';
  else{
    h='<div class="keys">';
    for(let s=0;s<24;s++){if(W7.has(s%12)){h+=`<div class="wk" data-n="${s}"></div>`;wi++}else h+=`<div class="bk" data-n="${s}" style="left:${wi*38-13}px"></div>`}
    h+='</div>';
  }
  $('#keys').innerHTML=h;
  $('#ol').textContent=drum?'–':oct;
}
const mark=(n,on)=>document.querySelectorAll(`#keys [data-n="${n}"]`).forEach(e=>e.classList.toggle('dn',on));
function noteOn(n,id){
  audio();ac.resume();
  if(!instOut){instOut=ac.createGain();instOut.gain.value=.7;instOut.connect(ac.destination)}
  if(held[id])return;
  const k=$('#isel').value,midi=12*(oct+1)+n,r=INST[k](ac,instOut,F(midi),ac.currentTime+.005,.8,n),ev=rec&&{k,midi,n,v:.8,t0:(performance.now()-rec.t0)/1000,t1:null};
  if(ev)rec.ev.push(ev);
  held[id]={r,ev,n};mark(n,true);
}
function noteOff(id){
  const h=held[id];if(!h)return;
  delete held[id];
  h.r(ac.currentTime+.005);
  if(h.ev&&h.ev.t1==null&&rec)h.ev.t1=(performance.now()-rec.t0)/1000;
  mark(h.n,false);
}
async function finishRec(r){
  if(!r.ev.length)return say('Nothing was recorded');
  say('Rendering your recording…',0);
  const dur=Math.max(...r.ev.map(e=>e.t1))+2.5,o=new OfflineAudioContext(1,Math.ceil(dur*44100),44100),out=o.createGain();
  out.gain.value=.7;out.connect(o.destination);
  r.ev.forEach(e=>INST[e.k](o,out,F(e.midi),e.t0,e.v,e.n)(e.t1));
  const f=new File([wav(await o.startRendering())],NAMES[r.ev[0].k]+' recording.wav',{type:'audio/wav'});
  await addFiles([f]);
  t=r.startT;addClip(media[media.length-1],'a');
  $('#ist').textContent='Recording added to the audio bar. Play again to layer more.';
  say('Recording added to the audio track');
}
$('#rec').onclick=()=>{
  if(!rec){
    audio();ac.resume();
    rec={t0:performance.now(),startT:t,ev:[]};
    if($('#along').checked&&clips.length)play();
    $('#rec').textContent='■ Stop';$('#ist').textContent='Recording… play some notes';
    return;
  }
  const r=rec,n=(performance.now()-r.t0)/1000;
  rec=null;pause();$('#rec').textContent='● Record';
  r.ev.forEach(e=>{if(e.t1==null)e.t1=n});
  finishRec(r);
};
$('#isel').onchange=()=>{oct={bass:2,guitar:3,flute:5}[$('#isel').value]||4;buildKeys()};
$('#om').onclick=()=>{oct=Math.max(1,oct-1);buildKeys()};
$('#op').onclick=()=>{oct=Math.min(7,oct+1);buildKeys()};
$('#xi').onclick=$('#instBtn').onclick=()=>P.classList.toggle('on');
$('#keys').addEventListener('pointerdown',e=>{
  const n=e.target.dataset.n;if(n==null)return;
  e.preventDefault();noteOn(+n,'p'+e.pointerId);
});
addEventListener('pointerup',e=>noteOff('p'+e.pointerId));
addEventListener('pointercancel',e=>noteOff('p'+e.pointerId));
addEventListener('keydown',e=>{
  if(!P.classList.contains('on')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey)return;
  const k=e.key.toLowerCase(),i=KM.indexOf(k);
  if(i<0||($('#isel').value==='drums'&&i>7))return;
  e.stopPropagation();e.preventDefault();
  if(!e.repeat)noteOn(i,'k'+k);
},true);
addEventListener('keyup',e=>noteOff('k'+e.key.toLowerCase()));
buildKeys();
renderAll();

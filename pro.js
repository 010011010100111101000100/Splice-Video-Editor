const audio0=audio;
audio=()=>{
  const c=audio0();
  if(!c.keep){c.keep=true;const o=c.createOscillator(),g=c.createGain();g.gain.value=.00001;o.connect(g);g.connect(dest);o.start()}
  return c;
};

function vFx(c,el,W,H,dw,dh,w,h){
  const f=cx.filter,u=Math.max(0,Math.min(1,(t-c.start)/len(c))),q=Math.min(1,(t-c.start)/.5),e=1-(1-q)**3;
  if(c.fill==='blur'){const s=Math.max(W/w,H/h);cx.filter='blur(28px) brightness(.55)';cx.drawImage(el,(W-w*s)/2,(H-h*s)/2,w*s,h*s);cx.filter=f}
  let sc=1+(c.kb||0)*u,rot=(c.rot||0)*Math.PI/180,ox=0;
  if(c.tr==='zoom')sc*=.5+.5*e;
  else if(c.tr==='slide')ox=(1-e)*W;
  else if(c.tr==='spin'){rot+=(1-e)*Math.PI/2;sc*=.6+.4*e}
  cx.save();cx.translate(W/2+ox,H/2);cx.rotate(rot);cx.scale(sc*(c.flip==='yes'?-1:1),sc);
  cx.drawImage(el,-dw/2,-dh/2,dw,dh);cx.restore();
}

let look='',flip=false;
const draw2=draw;
draw=()=>{
  draw2();
  const W=cv.width,H=cv.height;
  if(exporting){flip=!flip;cx.fillStyle=flip?'#020202':'#000';cx.fillRect(0,0,1,1)}
  if(look==='vig'){
    const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.7)');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  }else if(look==='grain'){
    for(let i=0;i<900;i++){cx.fillStyle=i%2?'rgba(255,255,255,.14)':'rgba(0,0,0,.14)';cx.fillRect(Math.random()*W,Math.random()*H,2,2)}
  }else if(look==='vhs'){
    cx.fillStyle='rgba(0,0,0,.2)';for(let y=0;y<H;y+=4)cx.fillRect(0,y,W,1);
  }
};

function wave(c){
  const m=mediaOf(c);
  if(!m||!m.pk)return'';
  const n=m.pk.length,a=Math.floor(c.in/m.dur*n),b=Math.max(a+1,Math.ceil(c.out/m.dur*n)),p=m.pk.slice(a,b);
  return`<svg class="wv" viewBox="0 0 ${p.length} 20" preserveAspectRatio="none"><path d="${p.map((v,i)=>`M${i} ${10-v*10}V${10+v*10}`).join('')}" stroke="rgba(255,255,255,.55)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
}
function peaks(){
  for(const m of media){
    if(m.type==='image'||m.pkTried)continue;
    m.pkTried=true;
    fetch(m.url).then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(buf=>{
      const d=buf.getChannelData(0),N=Math.min(6000,Math.ceil(m.dur*30)),step=d.length/N,pk=[];
      for(let i=0;i<N;i++){let mx=0;const s=Math.floor(i*step),k=Math.max(1,Math.floor(step/40));for(let j=s;j<s+step&&j<d.length;j+=k)mx=Math.max(mx,Math.abs(d[j]));pk.push(Math.min(1,mx*1.4))}
      m.pk=pk;renderTL();
    }).catch(()=>{});
  }
}
const addFiles0=addFiles;
addFiles=async f=>{await addFiles0(f);peaks()};

const ri2=renderInsp;
renderInsp=()=>{
  ri2();
  const c=clips.find(x=>x.id===sel);
  if(!c||c.track!=='v')return;
  c.tr=c.tr||'none';c.fill=c.fill||'black';c.flip=c.flip||'no';c.kb=c.kb||0;c.rot=c.rot||0;
  const o=(k,l,L)=>`<label>${l}<select data-k="${k}" style="width:100%">${L.map(v=>`<option value="${v[0]}"${c[k]===v[0]?' selected':''}>${v[1]}</option>`).join('')}</select></label>`;
  const r=(k,l,a,b,s)=>`<label>${l}<output>${(+c[k]).toFixed(2)}</output><input type="range" data-k="${k}" min="${a}" max="${b}" step="${s}" value="${c[k]}"></label>`;
  $('#insp').insertAdjacentHTML('beforeend',r('kb','Slow zoom (Ken Burns)',0,1,.05)+r('rot','Rotate',-180,180,1)+o('flip','Flip sideways',[['no','No'],['yes','Yes']])+o('tr','Entrance',[['none','None'],['zoom','Zoom in'],['slide','Slide in'],['spin','Spin in']])+o('fill','Empty space',[['black','Black'],['blur','Blurred video']]));
};

const marks=[];
const r0=renderTL;
renderTL=()=>{
  r0();
  const ru=$('#tl .ruler');
  if(ru)marks.forEach(m=>ru.insertAdjacentHTML('beforeend',`<i class="mk" data-t="${m}" style="left:${m*pps}px"></i>`));
};
$('#tl').addEventListener('dblclick',e=>{
  const m=e.target.closest('.mk');
  if(m){marks.splice(marks.indexOf(+m.dataset.t),1);renderTL()}
});

cv.addEventListener('pointerdown',e=>{
  const c=clips.find(x=>x.id===sel);
  if(!c||c.track!=='o'||t<c.start||t>=c.start+len(c))return;
  snap();
  const r=cv.getBoundingClientRect();
  const mv=ev=>{c.x=Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100));c.y=Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100))};
  mv(e);
  addEventListener('pointermove',mv);
  addEventListener('pointerup',()=>{removeEventListener('pointermove',mv);renderInsp()},{once:true});
});
cv.addEventListener('wheel',e=>{
  const c=clips.find(x=>x.id===sel);
  if(!c||c.track!=='o')return;
  e.preventDefault();c.size=Math.max(2,Math.min(60,c.size*(e.deltaY<0?1.06:.94)));
},{passive:false});

let vo=null;
$('#voBtn')?.remove();
async function voice(){
  if(vo){vo.stop();return}
  try{
    const st=await navigator.mediaDevices.getUserMedia({audio:true}),mr=new MediaRecorder(st),parts=[],startT=t;
    mr.ondataavailable=e=>parts.push(e.data);
    mr.onstop=async()=>{
      st.getTracks().forEach(x=>x.stop());pause();vo=null;$('#voBtn').textContent='🎙 Voiceover';
      try{
        const buf=await ac.decodeAudioData(await new Blob(parts).arrayBuffer());
        await addFiles([new File([wav(buf)],'Voiceover.wav',{type:'audio/wav'})]);
        t=startT;addClip(media[media.length-1],'a');
      }catch(err){say('Could not read the recording')}
    };
    vo=mr;audio();ac.resume();mr.start();
    if(clips.length)play();
    $('#voBtn').textContent='■ Stop voiceover';
  }catch(err){say('Microphone blocked. Allow it in your browser and try again.',4000)}
}

$('#exp').insertAdjacentHTML('beforebegin',`<select id="q" title="Export quality"><option value="4000000">Good quality</option><option value="8000000" selected>High quality</option><option value="16000000">Max quality</option></select><select id="fps" title="Frames per second"><option value="24">24 fps</option><option value="30" selected>30 fps</option><option value="60">60 fps</option></select><input type="color" id="acc" value="#7c6cff" title="Accent colour"><button id="hp" title="Shortcuts">?</button>`);
$('#bar').insertAdjacentHTML('beforeend',`<select id="look"><option value="">Look: none</option><option value="vig">Vignette</option><option value="grain">Film grain</option><option value="vhs">VHS lines</option></select><button id="voBtn">🎙 Voiceover</button><button id="fit">Fit timeline</button><canvas id="meter" width="120" height="12" title="Output level"></canvas>`);
document.body.insertAdjacentHTML('beforeend','<div id="help"><div><b>Space</b> play / pause &nbsp; <b>S</b> cut &nbsp; <b>Delete</b> remove clip<br><b>M</b> add marker (double-click a marker to remove) &nbsp; <b>F</b> fullscreen<br><b>← →</b> step (Shift = 1 second) &nbsp; <b>Ctrl+Z / Ctrl+Y</b> undo / redo<br>Drag text or stickers on the preview to move them, scroll to resize<br>Click a bar name to choose where new items go<br><br><button class="pri" id="hx">Got it</button></div></div>');
$('#look').onchange=e=>{look=e.target.value};
$('#voBtn').onclick=voice;
$('#fit').onclick=()=>{pps=Math.max(15,Math.min(200,($('#scroll').clientWidth-40)/Math.max(total,1)));$('#zoom').value=pps;renderTL()};
$('#acc').oninput=e=>document.documentElement.style.setProperty('--ac',e.target.value);
$('#hp').onclick=$('#hx').onclick=()=>$('#help').classList.toggle('on');
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey)return;
  if(e.key==='?')$('#help').classList.toggle('on');
  if(e.key==='m'||e.key==='M'){marks.push(t);marks.sort((a,b)=>a-b);renderTL()}
  if(e.key==='Escape')$('#help').classList.remove('on');
});

const mc=$('#meter').getContext('2d'),m8=new Uint8Array(128);
let an=null;
(function meter(){
  requestAnimationFrame(meter);
  if(!an&&master){an=ac.createAnalyser();an.fftSize=256;master.connect(an)}
  mc.clearRect(0,0,120,12);
  if(!an)return;
  an.getByteTimeDomainData(m8);
  let p=0;for(const v of m8)p=Math.max(p,Math.abs(v-128));
  const g=mc.createLinearGradient(0,0,120,0);
  g.addColorStop(0,'#3ddc97');g.addColorStop(.7,'#ffd166');g.addColorStop(1,'#ff5d73');
  mc.fillStyle=g;mc.fillRect(0,0,Math.min(120,p/128*240),12);
})();
renderAll();

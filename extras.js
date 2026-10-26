const SR=22050,NOTE=n=>440*2**((n-69)/12);
const LIB=[
{n:'Lo-fi chill',bpm:76,root:57,prog:[[0,3,7,10],[5,8,12,15],[3,7,10,14],[7,10,14,17]],pad:'triangle',lead:'sine',bass:'sine',beat:1,arp:1},
{n:'Upbeat summer',bpm:118,root:60,prog:[[0,4,7],[7,11,14],[9,12,16],[5,9,12]],pad:'sawtooth',lead:'square',bass:'triangle',beat:2,arp:2},
{n:'Epic cinematic',bpm:90,root:50,prog:[[0,3,7],[8,12,15],[3,7,10],[10,14,17]],pad:'sawtooth',lead:'triangle',bass:'sawtooth',beat:2,arp:1},
{n:'Retro arcade',bpm:140,root:64,prog:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]],pad:'square',lead:'square',bass:'square',beat:2,arp:2}
];
const SFX=['Whoosh','Ding','Pop','Boom'];
const FX=[['None',''],['Black & white','grayscale(1)'],['Vintage','sepia(.8) contrast(1.1)'],['Warm','sepia(.35) saturate(1.3)'],['Cool','hue-rotate(25deg) saturate(1.1)'],['Dreamy blur','blur(3px) brightness(1.1)']];
const ST=['🔥','⭐','❤️','😂','👍','🎉'],SH=[['rect','■'],['circle','●'],['star','★'],['heart','♥'],['tri','▲'],['arrow','➤']];

function mk(o){
  const out=o.createGain();out.gain.value=.5;out.connect(o.destination);
  const env=(g,s,d,v,a)=>{g.gain.setValueAtTime(.0001,s);g.gain.linearRampToValueAtTime(v,s+a);g.gain.exponentialRampToValueAtTime(.0001,s+d)};
  return{
    tone(type,f,s,d,v,lp,f2){
      const x=o.createOscillator(),g=o.createGain(),l=o.createBiquadFilter();
      x.type=type;x.frequency.setValueAtTime(f,s);if(f2)x.frequency.exponentialRampToValueAtTime(f2,s+d);
      l.frequency.value=lp||3000;env(g,s,d,v,.02);x.connect(l);l.connect(g);g.connect(out);x.start(s);x.stop(s+d+.05);
    },
    noise(s,d,v,hp,a){
      const n=o.createBuffer(1,SR*d|0,SR),w=n.getChannelData(0);
      for(let i=0;i<w.length;i++)w[i]=Math.random()*2-1;
      const x=o.createBufferSource(),g=o.createGain(),f=o.createBiquadFilter();
      f.type='highpass';f.frequency.value=hp;x.buffer=n;env(g,s,d,v,a||.005);x.connect(f);f.connect(g);g.connect(out);x.start(s);
    }
  };
}
function wav(buf){
  const d=buf.getChannelData(0),n=d.length,v=new DataView(new ArrayBuffer(44+n*2)),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,d[i]))*32767,true);
  return new Blob([v],{type:'audio/wav'});
}
async function song(c){
  const b=60/c.bpm,bars=16,o=new OfflineAudioContext(1,Math.ceil(bars*4*b*SR),SR),h=mk(o);
  for(let bar=0;bar<bars;bar++){
    const ch=c.prog[bar%4],s0=bar*4*b;
    ch.forEach(n=>h.tone(c.pad,NOTE(c.root+n),s0,4*b,.06,1200));
    for(let i=0;i<4;i++){
      const s=s0+i*b,k=c.arp*2;
      h.tone(c.bass,NOTE(c.root+ch[0]-24),s,b*.9,.22,400);
      for(let j=0;j<k;j++)h.tone(c.lead,NOTE(c.root+12+ch[j%ch.length]),s+j*b/k,b/k,.07,2500);
      if(i%2==0)h.tone('sine',120,s,.2,.8,400,40);
      else if(c.beat>1)h.noise(s,.15,.25,1500);
      h.noise(s+b/2,.04,.1,7000);
    }
  }
  return wav(await o.startRendering());
}
async function sfx(n){
  const o=new OfflineAudioContext(1,SR*2,SR),h=mk(o);
  if(n==='Whoosh')h.noise(0,1.6,.9,500,.7);
  if(n==='Ding'){h.tone('sine',1318,0,1.9,.6);h.tone('sine',2637,0,1,.2)}
  if(n==='Pop')h.tone('sine',700,0,.25,.9,3000,120);
  if(n==='Boom'){h.tone('sine',90,0,1.8,1,300,28);h.noise(0,1,.5,80)}
  return wav(await o.startRendering());
}
const cache={};
async function libAdd(k,i){
  const name=k==='m'?LIB[i].n:SFX[i],key=k+i;
  if(!cache[key]){
    say('Creating '+name+'…',0);
    cache[key]=new File([await(k==='m'?song(LIB[i]):sfx(SFX[i]))],name+'.wav',{type:'audio/wav'});
  }
  await addFiles([cache[key]]);
  addClip(media[media.length-1],'a');
  say(name+' added to the audio track');
}

const hist=[],redo=[];
function snap(){
  const s=JSON.stringify(clips);
  if(hist[hist.length-1]!==s){hist.push(s);if(hist.length>80)hist.shift();redo.length=0}
}
function restore(a,b){
  const cur=JSON.stringify(clips);
  while(a.length&&a[a.length-1]===cur)a.pop();
  if(!a.length)return;
  b.push(cur);clips=JSON.parse(a.pop());sel=null;relayout();t=Math.min(t,total);renderAll();
}
['addClip','split','del','move','dup'].forEach(n=>{const f=window[n];window[n]=(...a)=>{snap();return f(...a)}});
$('#split').onclick=()=>split();
$('#del').onclick=()=>del();
$('#tl').addEventListener('pointerdown',()=>snap(),true);
$('#insp').addEventListener('pointerdown',()=>snap(),true);
$('#insp').addEventListener('focusin',()=>snap());

function addOv(o){
  snap();
  clips.push({id:uid++,track:'o',mid:0,start:t,in:0,out:3,speed:1,vol:0,fade:.3,fx:'',text:'',shape:'',color:'#ffffff',size:10,x:50,y:50,rot:0,anim:'pop',sty:'outline',b:1,c:1,s:1,...o});
  sel=clips[clips.length-1].id;relayout();renderAll();
}
function shapePath(n,s){
  const r=s/2;
  if(n==='rect')cx.rect(-r*1.4,-r,r*2.8,r*2);
  else if(n==='circle')cx.arc(0,0,r,0,7);
  else if(n==='star'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;cx[i?'lineTo':'moveTo'](Math.cos(a)*d,Math.sin(a)*d)}cx.closePath()}
  else if(n==='heart'){cx.moveTo(0,r*.9);cx.bezierCurveTo(-r*1.6,-r*.1,-r*.7,-r*1.2,0,-r*.4);cx.bezierCurveTo(r*.7,-r*1.2,r*1.6,-r*.1,0,r*.9)}
  else if(n==='tri'){cx.moveTo(0,-r);cx.lineTo(r*1.1,r*.8);cx.lineTo(-r*1.1,r*.8);cx.closePath()}
  else if(n==='arrow'){
    [[-1.2,-.3],[.3,-.3],[.3,-.8],[1.3,0],[.3,.8],[.3,.3],[-1.2,.3]].forEach((p,i)=>cx[i?'lineTo':'moveTo'](p[0]*r,p[1]*r));
    cx.closePath();
  }
}
function drawOv(){
  const W=cv.width,H=cv.height;
  for(const c of clips){
    if(c.track!=='o'||t<c.start||t>=c.start+len(c))continue;
    const p=Math.min(1,(t-c.start)/.35),e=1-(1-p)**3,sc=c.anim==='pop'?.4+.6*e:1,dy=c.anim==='slide'?(1-e)*H*.08:0,s=H*c.size/100;
    cx.save();
    cx.globalAlpha=fadeF(c)*(c.anim==='none'?1:Math.min(1,e*2));
    cx.translate(W*c.x/100,H*c.y/100+dy);cx.rotate(c.rot*Math.PI/180);cx.scale(sc,sc);
    if(c.shape){cx.fillStyle=c.color;cx.beginPath();shapePath(c.shape,s);cx.fill()}
    else{
      const txt=c.text||'Text';
      cx.font=`bold ${s}px "Trebuchet MS",sans-serif`;cx.textAlign='center';cx.textBaseline='middle';
      if(c.sty==='box'){const w=cx.measureText(txt).width;cx.fillStyle='rgba(0,0,0,.65)';cx.fillRect(-w/2-s*.3,-s*.7,w+s*.6,s*1.4)}
      if(c.sty==='outline'){cx.lineWidth=s/6;cx.strokeStyle='#000';cx.lineJoin='round';cx.strokeText(txt,0,0)}
      cx.fillStyle=c.color;cx.fillText(txt,0,0);
    }
    cx.restore();
  }
}
function ovInsp(c){
  const r=(k,l,a,b,s)=>`<label>${l}<output>${(+c[k]).toFixed(1)}</output><input type="range" data-k="${k}" min="${a}" max="${b}" step="${s}" value="${c[k]}"></label>`;
  const o=(k,l,list)=>`<label>${l}<select data-k="${k}" style="width:100%">${list.map(v=>`<option value="${v[0]}"${c[k]===v[0]?' selected':''}>${v[1]}</option>`).join('')}</select></label>`;
  $('#insp').innerHTML=(c.shape?'':`<label>Text<input type="text" data-k="text" value="${c.text.replace(/"/g,'&quot;')}"></label>`+o('sty','Style',[['outline','Outline'],['box','Dark box'],['plain','Plain']]))
    +`<label>Colour<input type="color" data-k="color" value="${c.color}"></label>`
    +r('size','Size',2,60,1)+r('x','Left / right',0,100,1)+r('y','Up / down',0,100,1)+r('rot','Rotation',-180,180,1)+r('fade','Fade in/out (seconds)',0,2,.1)
    +o('anim','Entrance',[['pop','Pop'],['slide','Slide up'],['none','None']])
    +'<div class="acts"><button data-act="D">Duplicate</button></div>';
}

const baseDraw=draw,baseInsp=renderInsp;
draw=()=>{baseDraw();drawOv()};
renderInsp=()=>{
  const c=clips.find(x=>x.id===sel);
  if(c&&c.track==='o')return ovInsp(c);
  baseInsp();
  if(c&&c.track==='v')$('#insp').insertAdjacentHTML('beforeend',`<label>Filter<select data-k="fx" style="width:100%">${FX.map(f=>`<option value="${f[1]}"${c.fx===f[1]?' selected':''}>${f[0]}</option>`).join('')}</select></label>`);
};

document.head.insertAdjacentHTML('beforeend','<style>aside details{margin-top:12px}aside summary{cursor:pointer;color:var(--mut);font-weight:600;margin-bottom:8px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.grid .wide{grid-column:1/-1;text-align:left}.grid button{padding:5px}#stage:fullscreen{background:#000;padding:16px}</style>');
$('aside').insertAdjacentHTML('beforeend',`
<details open><summary>Text &amp; elements</summary><div class="grid"><button class="wide" data-ov="text">Add text</button>${SH.map(s=>`<button data-ov="${s[0]}" title="${s[0]}">${s[1]}</button>`).join('')}${ST.map(e=>`<button data-st="${e}">${e}</button>`).join('')}</div></details>
<details open><summary>Music library</summary><div class="grid">${LIB.map((m,i)=>`<button class="wide" data-lib="m${i}">♫ ${m.n}</button>`).join('')}</div></details>
<details open><summary>Sound effects</summary><div class="grid">${SFX.map((n,i)=>`<button data-lib="s${i}">${n}</button>`).join('')}</div></details>`);
$('aside').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const d=b.dataset;
  if(d.ov==='text')addOv({text:'Your text',size:9});
  else if(d.ov)addOv({shape:d.ov,size:20,color:'#ff5d73'});
  else if(d.st)addOv({text:d.st,sty:'plain',size:18});
  else if(d.lib)libAdd(d.lib[0],+d.lib.slice(1));
});

$('#bar').insertAdjacentHTML('beforeend','<button id="fs">Fullscreen</button><button id="shot">Save frame</button>');
const goFs=()=>document.fullscreenElement?document.exitFullscreen():$('#stage').requestFullscreen();
$('#fs').onclick=goFs;
cv.ondblclick=goFs;
$('#shot').onclick=()=>cv.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='frame.png';a.click()});
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;
  if(m&&k==='z'){e.preventDefault();e.shiftKey?restore(redo,hist):restore(hist,redo)}
  else if(m&&k==='y'){e.preventDefault();restore(redo,hist)}
  else if(k==='f'&&!m)goFs();
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){pause();t=Math.max(0,Math.min(total,t+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1)))}
});
renderAll();

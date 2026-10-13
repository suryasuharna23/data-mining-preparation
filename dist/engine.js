(function(root){
  'use strict';
  const KEY='mining-mind:v1';
  const fresh=()=>({version:1,attempts:{},bookmarks:[],recall:{},history:[],notes:{},session:null,focus:null});
  const exact=(selected,correct)=>Array.isArray(selected)&&selected.length===correct.length&&new Set(selected).size===selected.length&&selected.every(x=>correct.includes(x));
  const shuffle=(items,random=Math.random)=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const day=(date=new Date())=>{const d=new Date(date);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const validSelection=x=>x===null||Array.isArray(x)&&x.length<=4&&new Set(x).size===x.length&&x.every(n=>Number.isInteger(n)&&n>=0&&n<4);
  function validate(data,questions,topics){
    if(!data||data.version!==1||typeof data!=='object')throw Error('Format cadangan tidak dikenali.');
    const ids=new Set(questions.map(q=>q.id)),tids=new Set(topics.map(t=>t.id)),out=fresh();
    for(const [id,a] of Object.entries(data.attempts||{})){
      if(!ids.has(id)||!a||!Number.isInteger(a.tries)||a.tries<1||!Number.isInteger(a.right)||a.right<0||a.right>a.tries||typeof a.lastCorrect!=='boolean'||!validSelection(a.selected)||!Number.isFinite(a.at))throw Error('Data jawaban dalam cadangan tidak valid.');
      out.attempts[id]={tries:a.tries,right:a.right,lastCorrect:a.lastCorrect,selected:a.selected,at:a.at};
    }
    if(!Array.isArray(data.bookmarks)||data.bookmarks.some(id=>!ids.has(id)))throw Error('Daftar bookmark tidak valid.');
    out.bookmarks=[...new Set(data.bookmarks)];
    for(const [id,r] of Object.entries(data.recall||{})){
      if(!tids.has(id)||!r||!Number.isFinite(r.due)||!Number.isInteger(r.reps)||r.reps<0||![0,1,3,7].includes(r.interval))throw Error('Jadwal recall tidak valid.');
      out.recall[id]={due:r.due,reps:r.reps,interval:r.interval};
    }
    for(const [id,n] of Object.entries(data.notes||{})){if(!/^[1-6]$/.test(id)||typeof n!=='string'||n.length>20000)throw Error('Catatan tidak valid.');out.notes[id]=n;}
    if(!Array.isArray(data.history)||data.history.length>5000)throw Error('Riwayat tidak valid.');
    out.history=data.history.map(h=>{
      if(!h||!Number.isFinite(h.at)||!Number.isInteger(h.total)||h.total<1||h.total>300||!Number.isInteger(h.score)||h.score<0||h.score>h.total||!['practice','exam','review'].includes(h.mode)||!Array.isArray(h.ids)||h.ids.some(id=>!ids.has(id))||h.ids.length!==h.total)throw Error('Sesi riwayat tidak valid.');
      return {at:h.at,total:h.total,score:h.score,mode:h.mode,ids:h.ids};
    });
    if(data.session){const s=data.session;
      if(!Array.isArray(s.ids)||!s.ids.length||s.ids.length>300||new Set(s.ids).size!==s.ids.length||s.ids.some(id=>!ids.has(id))||!['practice','exam','review'].includes(s.mode)||!Number.isInteger(s.index)||s.index<0||s.index>=s.ids.length||!Number.isFinite(s.started)||typeof s.done!=='boolean'||!s.choices||typeof s.choices!=='object'||!s.checked||typeof s.checked!=='object')throw Error('Sesi tersimpan tidak valid.');
      for(const [id,v] of Object.entries(s.choices)){if(!s.ids.includes(id)||!validSelection(v))throw Error('Pilihan sesi tidak valid.');}
      for(const [id,v] of Object.entries(s.checked)){if(!s.ids.includes(id)||v!==true||!Array.isArray(s.choices[id]))throw Error('Status soal tidak valid.');}
      if(s.mode==='exam'&&!Number.isFinite(s.deadline))throw Error('Timer ujian tidak valid.');
      out.session={ids:s.ids,mode:s.mode,index:s.index,started:s.started,done:s.done,choices:s.choices,checked:s.checked,deadline:s.deadline||null,recorded:!!s.recorded,flags:Array.isArray(s.flags)?s.flags.filter(id=>s.ids.includes(id)):[]};
    }
    if(data.focus&&Number.isFinite(data.focus.remaining)&&data.focus.remaining>=0&&(!data.focus.until||Number.isFinite(data.focus.until)))out.focus=data.focus;
    return out;
  }
  function record(state,q,selection,at=Date.now()){
    const correct=exact(selection,q.correct),old=state.attempts[q.id]||{tries:0,right:0};
    state.attempts[q.id]={tries:old.tries+1,right:old.right+(correct?1:0),lastCorrect:correct,selected:selection===undefined?null:selection,at};return correct;
  }
  function finish(state,questions,at=Date.now()){
    const s=state.session;if(!s||s.recorded)return null;
    const byId=new Map(questions.map(q=>[q.id,q]));let score=0;
    for(const id of s.ids){const q=byId.get(id);if(!s.checked[id])record(state,q,s.choices[id],at);if(exact(s.choices[id],q.correct))score++;}
    const h={at,total:s.ids.length,score,mode:s.mode,ids:s.ids.slice()};
    s.done=true;s.recorded=true;state.history.unshift(h);state.history=state.history.slice(0,5000);return h;
  }
  function streak(state,now=new Date()){
    const days=new Set([...Object.values(state.attempts).map(a=>day(a.at)),...state.history.map(h=>day(h.at))]);
    const d=new Date(now);let n=0;if(!days.has(day(d)))d.setDate(d.getDate()-1);while(days.has(day(d))){n++;d.setDate(d.getDate()-1);}return n;
  }
  const api={KEY,fresh,exact,shuffle,day,validate,record,finish,streak,validSelection};root.Mining=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

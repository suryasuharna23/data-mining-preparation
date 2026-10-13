const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Mining=require('../dist/engine.js');
const root=path.resolve(__dirname,'../dist');
const files=['content.js','content-extra.js','variants.js','content-final.js'];
const ctx={};ctx.window=ctx;vm.createContext(ctx);for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const questions=JSON.parse(JSON.stringify(ctx.QUESTIONS)),topics=JSON.parse(JSON.stringify(ctx.TOPICS));

test('300 distinct questions: exactly 100 per level, each covering all six chapters',()=>{
 assert.equal(questions.length,300);assert.equal(topics.length,100);assert.equal(new Set(questions.map(q=>q.id)).size,300);assert.equal(new Set(questions.map(q=>q.prompt)).size,300);
 for(const level of [1,2,3]){const qs=questions.filter(q=>q.level===level);assert.equal(qs.length,100);assert.equal(new Set(qs.map(q=>q.chapter)).size,6);assert.ok(qs.some(q=>!q.correct.length));assert.ok(qs.some(q=>q.correct.length===1));assert.ok(qs.some(q=>q.correct.length>1));}
});
test('Every question has four unique options, a matching key, rationale, and source',()=>{
 const pageCounts={1:16,2:37,3:33,4:41,5:29,6:47};
 for(const q of questions){assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);assert.deepEqual(q.correct,q.options.filter(o=>o.correct).map(o=>o.id));assert.ok(q.explanation.length>30);assert.ok(q.options.every(o=>o.reason.length>=8));const pages=q.page.match(/\d+/g).map(Number);assert.ok(pages.every(p=>p>=1&&p<=(q.page.startsWith('GCN')?5:pageCounts[q.chapter])),q.id);}
 for(const c of ctx.CHAPTERS)assert.ok(fs.existsSync(path.join(root,'materials',c.file)));
 assert.ok(fs.existsSync(path.join(root,'materials/1790064322497_Proses-Detail-dari-GCN.pdf')));
});
test('Stable option shuffling has no reload drift',()=>{
 const other={};other.window=other;vm.createContext(other);for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),other);
 assert.equal(JSON.stringify(ctx.QUESTIONS),JSON.stringify(other.QUESTIONS));
 assert.ok(new Set(questions.map(q=>q.correct.join(','))).size>=8);
});
test('Exact scoring distinguishes omitted, explicit empty, partial, extra, and duplicate choices',()=>{
 assert.equal(Mining.exact(undefined,[]),false);assert.equal(Mining.exact(null,[]),false);assert.equal(Mining.exact([],[]),true);assert.equal(Mining.exact([],[1]),false);
 assert.equal(Mining.exact([2,0],[0,2]),true);assert.equal(Mining.exact([0],[0,2]),false);assert.equal(Mining.exact([0,1,2],[0,2]),false);assert.equal(Mining.exact([0,0],[0,2]),false);
});
const session=(ids,mode='exam')=>({ids,mode,index:0,started:Date.now(),deadline:Date.now()+3600000,choices:{},checked:{},flags:[],done:false,recorded:false});
test('Exam finalization counts unanswered empty-key questions as wrong and is idempotent',()=>{
 const zero=questions.find(q=>!q.correct.length),multi=questions.find(q=>q.correct.length===2),s=Mining.fresh();s.session=session([zero.id,multi.id]);s.session.choices[multi.id]=multi.correct;
 const h=Mining.finish(s,questions);assert.equal(h.score,1);assert.equal(h.total,2);assert.equal(s.attempts[zero.id].lastCorrect,false);assert.equal(s.attempts[zero.id].selected,null);assert.equal(Mining.finish(s,questions),null);assert.equal(s.history.length,1);assert.equal(s.attempts[multi.id].tries,1);
});
test('Explicit no-answer choice earns credit for zero-key question',()=>{const q=questions.find(q=>!q.correct.length),s=Mining.fresh();s.session=session([q.id]);s.session.choices[q.id]=[];assert.equal(Mining.finish(s,questions).score,1);});
test('Already checked practice answers are not counted twice on completion',()=>{
 const q=questions[0],s=Mining.fresh();s.session=session([q.id],'practice');s.session.choices[q.id]=q.correct;Mining.record(s,q,q.correct);s.session.checked[q.id]=true;Mining.finish(s,questions);assert.equal(s.attempts[q.id].tries,1);assert.equal(s.history[0].score,1);
});
test('Correct retry removes the latest-error state while retaining cumulative statistics',()=>{
 const q=questions.find(q=>q.correct.length),s=Mining.fresh();Mining.record(s,q,[]);assert.equal(s.attempts[q.id].lastCorrect,false);Mining.record(s,q,q.correct);assert.equal(s.attempts[q.id].lastCorrect,true);assert.equal(s.attempts[q.id].tries,2);assert.equal(s.attempts[q.id].right,1);
});
test('Saved session, zero selection, notes, timer, bookmarks, and history survive JSON round trip',()=>{
 const q=questions[0],s=Mining.fresh();s.session=session([q.id]);s.session.choices[q.id]=[];s.notes[1]='<script>not executable</script>';s.bookmarks=[q.id];s.recall[topics[0].id]={reps:2,due:Date.now(),interval:3};s.focus={remaining:10000,until:null};const restored=Mining.validate(JSON.parse(JSON.stringify(s)),questions,topics);assert.deepEqual(restored,s);
 Mining.finish(s,questions);assert.deepEqual(Mining.validate(JSON.parse(JSON.stringify(s)),questions,topics),s);
});
test('Malformed imports are rejected rather than partially overwriting progress',()=>{
 for(const mutate of [s=>s.version=8,s=>s.bookmarks=['missing'],s=>s.attempts.missing={tries:1},s=>s.session={ids:['bad']},s=>s.recall.t1={due:1,reps:0,interval:-1},s=>s.notes[1]=42]){const s=Mining.fresh();mutate(s);assert.throws(()=>Mining.validate(s,questions,topics));}
});
test('Streak handles local dates and continues from yesterday',()=>{const s=Mining.fresh(),now=new Date(2026,9,13,12);for(let i=1;i<=3;i++)s.history.push({at:new Date(2026,9,13-i,12).getTime()});assert.equal(Mining.streak(s,now),3);assert.equal(Mining.streak(s,new Date(2026,9,15,12)),0);});
test('Shuffle preserves elements without mutating its input',()=>{const xs=[1,2,3,4,5],ys=Mining.shuffle(xs,()=>.4);assert.deepEqual(xs,[1,2,3,4,5]);assert.deepEqual([...ys].sort(),xs);assert.notDeepEqual(ys,xs);});

function appHarness(){
 const nodes=new Map(),events={},storage=new Map();
 function node(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'',open:false,classList:{add(){},remove(){},toggle(){}},close(){this.open=false;},showModal(){this.open=true;},scrollIntoView(){},focus(){},setSelectionRange(){},click(){},setAttribute(){}});return nodes.get(key);}
 let hash='';const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
 const c={console,Date,Map,Set,Math,JSON,Number,String,Boolean,Array,Object,Error,Blob,URL,setTimeout:()=>1,clearTimeout(){},setInterval(){},location,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelector:node,addEventListener:(k,cb)=>events[k]=cb,createElement:()=>node('created')},addEventListener(){},scrollTo(){}};c.window=c;vm.createContext(c);
 for(const f of [...files,'engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
 return {c,nodes,events,run:code=>vm.runInContext(code,c),html:()=>node('#main').innerHTML};
}
test('Application renders every route from a clean state without runtime errors',()=>{
 const app=appHarness();assert.match(app.html(),/Enam bab/);for(const route of ['library/3','practice','session','recall','review','progress']){app.run(`location.hash='#${route}';render();`);assert.ok(app.html().length>200,route);assert.doesNotMatch(app.html(),/undefined|NaN/);}
});
test('Practice UI blocks unselected submit, shows feedback, and resumes exact choices',()=>{
 const app=appHarness();app.run("begin(['t1l1'],'practice');");assert.match(app.html(),/Periksa jawaban/);assert.equal(app.run('Object.keys(state.attempts).length'),0);app.run('check()');assert.equal(app.run('Object.keys(state.attempts).length'),0);
 app.run('for(const i of Q.get("t1l1").correct)choose(i);check();');assert.equal(app.run('state.attempts.t1l1.lastCorrect'),true);assert.match(app.html(),/Konsepnya sudah nyambung/);app.run('check();choose(-1)');assert.equal(app.run('state.attempts.t1l1.tries'),1);assert.equal(app.run('Mining.exact(state.session.choices.t1l1,Q.get("t1l1").correct)'),true);
});
test('Exam hides answer explanations until submission and expires across routes',()=>{
 const app=appHarness();app.run("begin(['t1l1'],'exam');choose(0);");assert.doesNotMatch(app.html(),/class="option-reasons"|class="answer-key"/);assert.equal(app.run('Object.keys(state.attempts).length'),0);app.run("location.hash='#home';render();state.session.deadline=Date.now()-1;tick();");assert.equal(app.run('state.session.done'),true);assert.equal(app.run('state.history.length'),1);app.run("location.hash='#session';render();");assert.match(app.html(),/Pembahasan sesi/);assert.match(app.html(),/class="option-reasons"/);
});
test('Unsafe note markup is escaped and no-answer toggle differs from deselecting last option',()=>{
 const app=appHarness();app.run("state.notes[1]='<img src=x onerror=alert(1)>';location.hash='#library/1';render();");assert.match(app.html(),/&lt;img/);assert.doesNotMatch(app.html(),/<img src=x/);
 app.run("begin(['t1l1'],'practice');choose(0);choose(0);");assert.equal(app.run('state.session.choices.t1l1'),undefined);app.run('choose(-1)');assert.equal(app.run('state.session.choices.t1l1.length'),0);
});

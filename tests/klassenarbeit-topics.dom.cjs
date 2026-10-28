/* Run: npm install --no-save jsdom@26 && node tests/klassenarbeit-topics.dom.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');const root=path.resolve(__dirname,'..');let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(v,m)=>{assert.ok(v,m);checks++};
function open(file,storage={},hash=''){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('Could not parse CSS'))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://example.test/'+file+hash,runScripts:'outside-only',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window;w.confirm=()=>false;w.print=()=>{};for(const [k,v]of Object.entries(storage))w.localStorage.setItem(k,v);
 w.eval(fs.readFileSync(path.join(root,'merkheft-themen.js'),'utf8'));return{dom,w,d:w.document,errors,close:()=>w.close()};
}
function click(d,s){const el=d.querySelector(s);assert.ok(el,'missing '+s);el.click()}
function input(w,d,s,value){const el=d.querySelector(s);assert.ok(el,'missing '+s);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
function change(w,d,s,value){const el=d.querySelector(s);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}))}
(async()=>{
 let x=open('subjectobjectquestions.html');let {w,d}=x;const g=w.MerkheftLearning;
 eq(g.bank.length,36);eq(d.querySelectorAll('[data-task]').length,36);eq(d.querySelectorAll('[data-task]:not([hidden])').length,6);eq(d.querySelectorAll('.learn-panel:not([hidden])').length,1);
 for(const q of g.bank)for(const answer of q.answers)eq(g.diagnose(q,answer).status,'correct',q.id+' '+answer);
 for(const q of g.bank)for(const answer of q.wrong||[])eq(g.diagnose(q,answer).status,'error',q.id+' wrong '+answer);
 eq(g.diagnose(g.bank[0],'').status,'empty');eq(g.diagnose(g.bank[0],'Who broke the window').status,'format');eq(g.diagnose(g.bank[0],'who broke the window?').status,'format');eq(g.diagnose(g.bank[0],'Who broke the window??').status,'format');eq(g.diagnose(g.bank[0],'Who smashed the window?').status,'unknown');
 for(const step of g.config.steps){click(d,'[data-step="'+step.id+'"]');eq(d.querySelector('.learn-panel:not([hidden])').id,step.id);eq(d.querySelectorAll('.learn-panel:not([hidden])').length,1)}
 click(d,'[data-mode="nachschlagen"]');ok(!d.querySelector('#nachschlagen').hidden);ok(d.querySelector('#lernen').hidden);click(d,'[data-mode="lernen"]');eq(d.querySelector('.learn-panel:not([hidden])').id,'rollen');click(d,'[data-goto="vergleichen"]');eq(d.querySelector('.learn-panel:not([hidden])').id,'vergleichen');
 for(let i=0;i<g.config.comparisons.length;i++){change(w,d,'#compare-case',String(i));for(const role of ['subject','object']){click(d,'[data-role="'+role+'"]');eq(d.querySelector('#compare-output').textContent,g.config.comparisons[i][role].question)}}
 g.navigate('schreibcheck');const card=d.querySelector('[data-task="so-01"]');click(d,'[data-task="so-01"] [data-check]');ok(card.querySelector('[data-model]').disabled,'empty attempt cannot reveal');
 input(w,d,'#so-01-input','Who broke the window?');click(d,'[data-task="so-01"] [data-check]');eq(g.state.practice['so-01'].status,'correct');ok(!card.querySelector('[data-model]').disabled);
 click(d,'[data-task="so-01"] [data-model]');eq(g.state.practice['so-01'].status,'model');ok(!card.querySelector('.model').hidden);input(w,d,'#so-01-input','Who broke the window');ok(card.querySelector('.model').hidden);ok(card.querySelector('[data-model]').disabled);eq(g.state.practice['so-01'].status,'open');
 click(d,'[data-task="so-01"] [data-check]');eq(g.state.practice['so-01'].status,'format');input(w,d,'#so-01-input','Who broke the window?');click(d,'[data-task="so-01"] [data-check]');eq(g.state.practice['so-01'].status,'helped');click(d,'[data-task="so-01"] [data-retry]');input(w,d,'#so-01-input','Who broke the window?');click(d,'[data-task="so-01"] [data-check]');eq(g.state.practice['so-01'].status,'correct');
 for(const group of ['past','present','prepositions','mixed']){change(w,d,'#question-filter',group);const active=[...d.querySelectorAll('[data-task]:not([hidden])')];ok(active.length>0&&active.length<=6);ok(active.every(c=>g.bank.find(q=>q.id===c.dataset.task).group===group))}
 change(w,d,'#question-filter','all');const before=[...d.querySelectorAll('[data-task]:not([hidden])')].map(c=>c.dataset.task).join(',');click(d,'#next-tasks');ok(before!==[...d.querySelectorAll('[data-task]:not([hidden])')].map(c=>c.dataset.task).join(','));click(d,'#previous-tasks');eq(before,[...d.querySelectorAll('[data-task]:not([hidden])')].map(c=>c.dataset.task).join(','));
 input(w,d,'#note-example','Who called Ben?');change(w,d,'#compare-case','3');w.dispatchEvent(new w.Event('pagehide'));const data=w.localStorage.getItem('hanna_merkheft_subjectobject_v1');eq(x.errors.length,0);x.close();
 x=open('subjectobjectquestions.html',{'hanna_merkheft_subjectobject_v1':data});({w,d}=x);eq(d.querySelector('#note-example').value,'Who called Ben?');eq(d.querySelector('#so-01-input').value,'Who broke the window?');eq(d.querySelector('#compare-case').value,'3');eq(d.querySelector('#compare-source').textContent,'Nora tells Eva about her trip.');eq(x.errors.length,0);x.close();

 x=open('mediation.html');({w,d}=x);const mg=w.MerkheftLearning;eq(mg.config.drafts.length,6);eq(d.querySelectorAll('[data-draft]').length,6);
 for(const step of mg.config.steps){click(d,'[data-step="'+step.id+'"]');eq(d.querySelector('.learn-panel:not([hidden])').id,step.id)}
 click(d,'[data-step="auswaehlen"]');click(d,'#selection-check');ok(d.querySelector('#selection-feedback').textContent.includes('Vergleiche'));ok(d.querySelector('#selection-feedback').querySelectorAll('li').length===7);
 for(const i of [0,2]){d.querySelector('#fact-'+i).checked=true;d.querySelector('#fact-'+i).dispatchEvent(new w.Event('change',{bubbles:true}))}click(d,'#selection-check');ok(d.querySelector('#selection-feedback').textContent.startsWith('Deine Auswahl passt'));
 change(w,d,'#selection-recipient','visit');eq([...d.querySelectorAll('#selection-facts input:checked')].length,0);ok(d.querySelector('#selection-feedback').hidden);
 for(const i of [0,1,2,3,4,6])d.querySelector('#fact-'+i).checked=true;click(d,'#selection-check');ok(d.querySelector('#selection-feedback').textContent.startsWith('Deine Auswahl passt'));
 mg.navigate('schreibcheck');
 for(const q of mg.config.drafts){
  const c=d.querySelector('[data-draft="'+q.id+'"]');eq(c.querySelector('.draft-input').lang,q.direction==='Deutsch → Englisch'?'en':'de');ok(c.querySelector('[data-draft-model]').disabled);c.querySelector('[data-review]').click();ok(c.querySelector('[data-draft-model]').disabled);ok(c.querySelector('.model').hidden);
  input(w,d,'#'+q.id,q.model);c.querySelector('[data-review]').click();ok(!c.querySelector('.review').hidden);ok(!c.querySelector('[data-draft-model]').disabled);eq(c.querySelectorAll('.criteria input').length,q.criteria.length);ok(!c.querySelector('.feedback').classList.contains('good'),'free text never receives an automatic correct status');c.querySelector('[data-draft-model]').click();ok(!c.querySelector('.model').hidden);ok(c.querySelector('.model').textContent.includes(q.model));
  const cb=c.querySelector('.criteria input');cb.checked=true;cb.dispatchEvent(new w.Event('change',{bubbles:true}));ok(c.querySelector('.review-progress').textContent.startsWith('1 von'));
  input(w,d,'#'+q.id,q.model+' ');ok(c.querySelector('.model').hidden);ok(c.querySelector('.review').hidden);ok(c.querySelector('[data-draft-model]').disabled);eq(c.querySelectorAll('.criteria input:checked').length,0);c.querySelector('[data-review]').click();
 }
 input(w,d,'#medtext-notes','Saturday, free, sports hall if rain');input(w,d,'#note-question','Wie wähle ich die Zeitform?');w.dispatchEvent(new w.Event('pagehide'));const meddata=w.localStorage.getItem('hanna_merkheft_mediation_v1');eq(x.errors.length,0);x.close();
 x=open('mediation.html',{'hanna_merkheft_mediation_v1':meddata},'#notizen');({w,d}=x);eq(d.querySelector('#medtext-notes').value,'Saturday, free, sports hall if rain');eq(d.querySelector('#note-question').value,'Wie wähle ich die Zeitform?');ok(!d.querySelector('#notizen').hidden);ok(d.querySelector('#lernen').hidden);eq(x.errors.length,0);x.close();
 console.log(JSON.stringify({passed:true,assertions:checks,questions:36,mediationDrafts:6,scope:'DOM interaction and answer checks; no visual browser claim'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});

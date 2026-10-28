const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.QUESTIONS_QA_OUTPUT||fs.mkdtempSync(require('node:os').tmpdir()+'/questions-qa-');
(async()=>{
 const server=http.createServer((req,res)=>{const p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end('Not found')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const b=await chromium.launch({headless:true,...(process.env.QUESTIONS_CHROMIUM_PATH?{executablePath:process.env.QUESTIONS_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu']});
 let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++};const eq=(a,v,msg)=>{assert.deepEqual(a,v,msg);checks++};
 const errors=[];const context=await b.newContext({viewport:{width:1440,height:1000}});const p=await context.newPage();p.on('pageerror',err=>errors.push(err.message));
 await p.goto(origin+'/questions.html');
 eq(await p.locator('.compass-mode-btn').count(),4);eq(await p.locator('.learn-step-btn').count(),7);
 eq(await p.locator('.write-task').count(),72);eq(await p.locator('.open-task').count(),4);
 eq(await p.locator('.trap-card').count(),12);eq(await p.locator('.micro-check').count(),4);eq(await p.locator('.mini-check').count(),12);
 ok(!(await p.locator('.thinking-line').textContent()).includes('Frageart erkennen'),'old duplicate thinking text removed');
 const allAnswers=await p.evaluate(()=>QuestionsLearning.bank.flatMap(t=>t.answers.map(answer=>({id:t.id,answer,status:QuestionsLearning.diagnose(t,answer).status}))));
 for(const a of allAnswers)eq(a.status,'correct',a.id+' '+a.answer);
 const testcases=[
 ['q-wc-01','Do you play tennis','format'],['q-wc-01','do you play tennis?','format'],['q-wc-01','Do you play tennis??','format'],
 ['q-wc-01','Do you plays tennis?','wrong'],['q-wc-05','Does she plays tennis?','wrong'],['q-wc-05','Does she play tennis?','correct'],
 ['q-wc-25','Who did Lucy called Ben yesterday?','wrong'],['q-wc-25','Who called Ben yesterday?','correct'],
 ['q-wc-26','Who called Lucy yesterday?','wrong'],['q-wc-26','Who did Lucy call yesterday?','correct'],
 ['q-wc-38','Who did Lucy talk yesterday?','wrong'],['q-wc-38','Who did Lucy talk to yesterday?','correct'],
 ['q-wc-54',"No, she doesn't.",'correct'],['q-wc-54','No, she doesn’t.','correct'],['q-wc-54','No, she does not.','correct'],
 ['q-wc-54','No, she dont.','wrong'],['q-wc-54','No, she doesnt.','format'],['q-wc-54','No she doesn’t.','format'],
 ['q-wc-60',"Yes, I'm.",'format'],['q-wc-60','Yes, I am.','correct'],
 ['q-wc-63','Where did they were yesterday?','wrong'],['q-wc-63','Where were they yesterday?','correct'],
 ['q-wc-27','Who broke the window?','correct'],['q-wc-27','Who did break the window?','wrong'],
 ['q-wc-01','Do  you  play tennis ?','correct'],['q-wc-13','Does your brother swim every day?','correct'],
 ['q-wc-11','Does mia live in London?','format'],['q-wc-03','How often does he watch television?','correct'],
 ['q-wc-01','', 'empty'],['q-wc-39','What are they talking about?','correct'],['q-wc-39','What are they talking?','wrong']
 ];
 for(const [id,value,status]of testcases){const actual=await p.evaluate(({id,value})=>{const t=QuestionsLearning.bank.find(t=>t.id===id);return QuestionsLearning.diagnose(t,value).status},{id,value});eq(actual,status,id+' '+value)}
 // Every step is reachable and has one visible panel; real browser history returns to prior steps.
 for(const val of ['rules','subject','machine','traps','check','writecheck']){await p.locator(`[data-tab="q-learn"][data-val="${val}"]`).click();eq(await p.locator('.learn-panel:visible').count(),1);eq(await p.locator(`.learn-panel[data-val="${val}"]:visible`).count(),1)}
 await p.goBack();eq(await p.locator('.learn-panel:visible').getAttribute('data-val'),'check');
 await p.goForward();eq(await p.locator('.learn-panel:visible').getAttribute('data-val'),'writecheck');
 eq(await p.locator('.write-task:visible').count(),6);
 await p.locator('#q-wc-01-input').fill('Do you play tennis?');await p.locator('#q-wc-01-input').press('Enter');
 ok((await p.locator('[data-review-id="q-wc-01"] .feedback').textContent()).startsWith('Richtig.'));
 ok((await p.locator('#bank-progress').textContent()).startsWith('1 ohne Hilfe'));
 await p.locator('[data-review-id="q-wc-01"] [data-show-solution]').click();
 ok((await p.locator('[data-review-id="q-wc-01"] .feedback').textContent()).startsWith('Mit aufgedeckter Lösung'));
 ok((await p.locator('#bank-progress').textContent()).startsWith('0 ohne Hilfe'));
 await p.locator('[data-review-id="q-wc-01"] [data-retry-task]').click();await p.locator('#q-wc-01-input').fill('Do you play tennis?');await p.locator('#q-wc-01-input').press('Enter');
 ok((await p.locator('#bank-progress').textContent()).startsWith('1 ohne Hilfe'));
 await p.locator('#q-wc-01-input').fill('Does you play tennis?');eq(await p.locator('[data-review-id="q-wc-01"] .feedback:visible').count(),0);ok((await p.locator('#bank-progress').textContent()).startsWith('0 ohne Hilfe'));
 await p.locator('[data-review-id="q-wc-02"] [data-check-task]').click();ok(await p.locator('[data-review-id="q-wc-02"] [data-show-solution]').isDisabled());
 await p.locator('#q-wc-02-input').fill('Wo?');await p.locator('#q-wc-02-input').press('Enter');await p.locator('[data-review-id="q-wc-02"] [data-show-help]').click();await p.locator('#q-wc-02-input').fill('Where does she play tennis?');await p.locator('#q-wc-02-input').press('Enter');ok((await p.locator('[data-review-id="q-wc-02"] .feedback').textContent()).startsWith('Richtig mit Hilfe.'));
 await p.locator('#topic-filter').selectOption('prepositions');eq(await p.locator('.write-task:visible').count(),6);await p.locator('#next-tasks').click();eq(await p.locator('.write-task:visible').count(),2);
 await p.locator('#kind-filter').selectOption('Lücke');eq(await p.locator('.write-task:visible').count(),1);
 await p.locator('#kind-filter').selectOption('Kurzantwort');eq(await p.locator('.write-task:visible').count(),0);ok(await p.locator('#check-all').isDisabled());
 await p.locator('#kind-filter').selectOption('all');await p.locator('#topic-filter').selectOption('all');
 // Open-ended tasks never claim automatic correctness; checklist/model stays hidden without a draft.
 await p.locator('[data-open-id="q-open-01"] [data-open-model]').click();ok(await p.locator('[data-open-id="q-open-01"] .open-review').isHidden());
 await p.locator('#q-open-01').fill('Did you visit London?');await p.locator('[data-open-id="q-open-01"] [data-open-model]').click();ok(await p.locator('[data-open-id="q-open-01"] .open-review').isVisible());
 // Guided sentence builder: all twelve scenarios have coherent sentences; wrong verbs do not get built.
 await p.locator('[data-tab="q-learn"][data-val="machine"]').click();
 for(let i=0;i<12;i++){
  await p.locator('#machine-case').selectOption(String(i));const s=await p.evaluate(i=>QuestionsLearning.scenarios[i],i);
  const groups=p.locator('.machine-group');for(const [index,key]of [[0,'q'],[1,'aux'],[2,'verb']])await groups.nth(index).getByRole('button',{name:s[key],exact:true}).click();
  await p.locator('#build-question').click();const out=await p.locator('#machine-sentence').textContent();ok(out.endsWith('?'),s.title+': '+out);ok((await p.locator('#machine-rule').textContent()).startsWith('Richtig.'));
 }
 await p.locator('#machine-case').selectOption('2');await p.locator('.machine-group').nth(0).getByRole('button',{name:'kein Fragewort',exact:true}).click();await p.locator('.machine-group').nth(1).getByRole('button',{name:'did',exact:true}).click();await p.locator('.machine-group').nth(2).getByRole('button',{name:'went',exact:true}).click();await p.locator('#build-question').click();ok((await p.locator('#machine-sentence').textContent()).includes('Prüfe die Form'));
 // Choice explanations and a complete self-check outcome.
 await p.locator('[data-tab="q-learn"][data-val="traps"]').click();await p.locator('.trap-card').first().locator('[data-correct="false"]').click();ok((await p.locator('.trap-card').first().locator('.feedback').textContent()).includes('Grundform'));
 await p.locator('[data-tab="q-learn"][data-val="check"]').click();
 await p.evaluate(()=>document.querySelectorAll('.mini-check').forEach(w=>Array.from(w.querySelectorAll('button')).find(b=>b.dataset.mini===w.dataset.answer).click()));await p.locator('#evaluate-mini').click();ok((await p.locator('#mini-summary').textContent()).includes('12 aktuell richtig'));
 // Persistence across reload, notes, and no arbitrary HTML restored from the legacy storage.
 await p.locator('[data-tab="q-main"][data-val="notes"]').click();await p.locator('#note-own').fill('Who called Ben?');await p.locator('#save-notes').click();await p.reload();eq(await p.locator('#note-own').inputValue(),'Who called Ben?');eq(await p.locator('.compass-mode-panel:visible').getAttribute('data-val'),'notes');
 await p.locator('#homework-toggle').click();eq(await p.locator('#nachschlagen:visible').count(),1);eq(await p.locator('.compass-mode-grid:visible').count(),0);await p.locator('#homework-toggle').click();eq(await p.locator('#lernen:visible').count(),1);
 await p.goto(origin+'/questions.html#q-learn-subject');eq(await p.locator('.learn-panel:visible').getAttribute('data-val'),'subject');
 await p.goto(origin+'/questions.html#schreibcheck');eq(await p.locator('.learn-panel:visible').getAttribute('data-val'),'writecheck');
 // Print media shows the actual reference, not the active exercise panel.
 await p.evaluate(()=>document.body.classList.add('q-spickzettel-print'));await p.emulateMedia({media:'print'});eq(await p.locator('#nachschlagen:visible').count(),1);eq(await p.locator('#lernen:visible').count(),0);eq(await p.locator('#print-sheet:visible').count(),1);eq(await p.locator('#nachschlagen .ref-wrap:visible').count(),0);await p.pdf({path:OUT+'/qa-reference.pdf',format:'A4',printBackground:true});await p.emulateMedia({media:'screen'});await p.evaluate(()=>document.body.classList.remove('q-spickzettel-print'));
 // Width checks across every panel. Tables scroll inside their own wrappers.
 for(const width of [1440,1024,768,390,320]){
  await p.setViewportSize({width,height:900});
  for(const val of ['start','rules','subject','machine','traps','check','writecheck']){
   await p.locator('[data-tab="q-main"][data-val="learn"]').click();await p.locator(`[data-tab="q-learn"][data-val="${val}"]`).click();
   const dims=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));ok(dims.scroll<=dims.w+1,`Overflow ${width} ${val} ${JSON.stringify(dims)}`);
   if(width===390&&['rules','subject','machine','writecheck'].includes(val))await p.screenshot({path:OUT+`/qa-${val}-mobile.png`,fullPage:true});
  }
  for(const mode of ['reference','connections','notes']){await p.locator(`[data-tab="q-main"][data-val="${mode}"]`).click();const dims=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));ok(dims.scroll<=dims.w+1,`Overflow ${width} ${mode}`)}
 }
 await p.setViewportSize({width:1440,height:1000});await p.locator('[data-tab="q-main"][data-val="learn"]').click();await p.locator('[data-tab="q-learn"][data-val="start"]').click();await p.screenshot({path:OUT+'/qa-start-desktop.png',fullPage:true});
 await p.locator('[data-tab="q-learn"][data-val="rules"]').click();await p.screenshot({path:OUT+'/qa-rules-desktop.png',fullPage:true});
 const nocontext=await b.newContext({javaScriptEnabled:false});const nojs=await nocontext.newPage();await nojs.goto(origin+'/questions.html');ok(await nojs.locator('#q-learn-rules').isVisible(),'progressive enhancement with JavaScript disabled');await nocontext.close();
 const oldcontext=await b.newContext();await oldcontext.addInitScript(()=>{localStorage.setItem('kompass_questions_history_storage_v1',JSON.stringify({nav:{mode:'learn',learn:'subject'},fields:{'q-wc-01-input':'Do you play tennis?','note-own':'Newer unsaved note'},machineSentence:'<img src=x onerror="window.legacyAttack=true">'}));localStorage.setItem('kompass_questions_journal',JSON.stringify({own:'My old note'}))});const old=await oldcontext.newPage();await old.goto(origin+'/questions.html');eq(await old.locator('#q-wc-01-input').inputValue(),'Do you play tennis?');eq(await old.locator('#note-own').inputValue(),'Newer unsaved note');eq(await old.evaluate(()=>!!window.legacyAttack),false);await oldcontext.close();
 eq(errors,[],'no browser JS errors');
 await b.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:true,assertions:checks,canonicalAnswers:allAnswers.length,widths:[1440,1024,768,390,320],browserErrors:errors},null,2));
})().catch(err=>{console.error(err);process.exit(1)});

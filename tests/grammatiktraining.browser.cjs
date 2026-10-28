const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.GRAMMAR_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'grammar-qa-'));
(async()=>{
 const server=http.createServer((req,res)=>{try{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(ROOT,decodeURIComponent(req.url.split('?')[0]))))}catch{res.statusCode=404;res.end('Not found')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const b=await chromium.launch({headless:true,...(process.env.QUESTIONS_CHROMIUM_PATH?{executablePath:process.env.QUESTIONS_CHROMIUM_PATH}:{}),args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu']});
 let checks=0;const eq=(a,z,msg)=>{assert.deepEqual(a,z,msg);checks++},ok=(v,msg)=>{assert.ok(v,msg);checks++};
 const context=await b.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/grammatiktraining.html');
 const info=await p.evaluate(()=>{const g=GrammarTraining;return{counts:[g.TASKS.length,g.FREE_TASKS.length],answers:[...g.TASKS,...g.FREE_TASKS].flatMap(q=>q.answers.map(a=>({id:q.id,answer:a,result:g.diagnoseAnswer(q,a)}))),coverage:Object.keys(g.TOPICS).map(topic=>({topic,basic:g.TASKS.filter(q=>q.topic===topic).length,free:g.FREE_TASKS.filter(q=>q.topic===topic).length})),ids:[...g.TASKS,...g.FREE_TASKS].map(q=>q.id)}});
 eq(info.counts,[169,167]);eq(new Set(info.ids).size,336,'unique task IDs');
 for(const q of info.answers)eq(q.result.kind,'correct',q.id+': '+q.answer+' '+JSON.stringify(q.result));
 for(const c of info.coverage){ok(c.basic>=12,c.topic+' basic coverage');ok(c.free>=12,c.topic+' free coverage')}
 const examples=[
 ['basic','B-articles-1','an','correct'],['basic','B-articles-1','an apple','unknown'],['basic','B-articles-3','The','correct'],
 ['free','F-articles-4','an hour','correct'],['free','F-pronouns-3','I can see them.','unknown'],['free','F-pronouns-3','I can see her.','correct'],
 ['basic','B-tobe-4',"They aren't late.",'correct'],['basic','B-havegot-2',"I haven't got a bike.",'correct'],['free','F-havegot-1',"She's got a brother.",'correct'],
 ['free','F-havegot-4',"They've got two cats.",'correct'],['free','F-tobe-1',"I'm happy today.",'correct'],
 ['free','KF-10','Do you play basketball','format'],['free','KF-10','do you play basketball?','format'],['free','KF-10','Do you play basketball??','format'],
 ['free','KF-10','Does you play basketball?','unknown'],['free','KF-02','Ben seen a fox in the garden yesterday.','unknown'],
 ['free','KF-08','We didnt go to London last weekend.','format'],['free','KF-08','We did not go to London last weekend.','correct'],
 ['basic','RB-tobe-11',"Yes, I'm.",'format'],['basic','RB-tobe-11','Yes, I am.','correct'],['basic','RB-tobe-11','Yes I am.','format'],
 ['basic','GT-01','walk','error'],['basic','GT-01','walks','correct'],['basic','GT-01','Emma usually walks to school.','format'],
 ['basic','GT-42','Where did you were yesterday?','error'],['basic','PGT-10','Does she watching TV?','error'],
 ['free','QF-76','Who did Emma wanted to meet?','error'],['free','QF-76','Who did Emma meet?','unknown'],['free','QF-76','Who did Emma want to meet?','correct'],
 ['free','QF-78','Who does Nora tell to about her trip?','unknown'],['free','QF-81','What school does Ben go?','unknown'],
 ['free','QF-84','What did Ben did yesterday?','unknown'],['free','QF-84','What did Ben do yesterday?','correct'],
 ['basic','RB-pronouns-09',"it's",'error'],['basic','RB-pronouns-09','its','correct'],
 ['free','PGF-01','The dog is running in the garden now.','correct'],['free','KF-01','Mia plays tennis on Fridays.','correct'],
 ['free','QF-85','What do you like sailing?','unknown'],['free','QF-85','Do you like sailing?','correct'],
 ['free','QF-87','Did you visit the museum yesterday?','correct'],['free','QF-89','When did Eva get home?','correct'],
 ['free','KF-01','Mia plays tennis on fridays.','format'],['free','KF-28','Who did mrs Bennett call?','format'],
 ['basic','B-tobe-1','','empty']
 ];
 for(const [mode,id,value,kind]of examples){const got=await p.evaluate(({mode,id,value})=>{const g=GrammarTraining,q=(mode==='basic'?g.TASKS:g.FREE_TASKS).find(q=>q.id===id);return g.diagnoseAnswer(q,value).kind},{mode,id,value});eq(got,kind,id+' '+value)}
 // All choices can create a valid current task in each mode without crashes.
 for(const mode of ['basic','free'])for(const topic of info.coverage.map(x=>x.topic)){
  await p.evaluate(({mode,topic})=>{const g=GrammarTraining;g.state.train=null;g.state.trainMode=mode;g.state.selectedTopics=[topic];g.newTraining();g.showTab('training')},{mode,topic});
  eq(await p.locator('#training:visible').count(),1);ok((await p.locator('#trainTask').textContent()).length>10);ok((await p.locator('#responseGuide').textContent()).startsWith('Gesucht:'));
 }
 // Every selected theme is represented at least twice, and exams respect the selected mode.
 const exams=await p.evaluate(()=>{const g=GrammarTraining,r=[];for(const mode of ['basic','free'])for(const topics of [['articles'],['questions'],['simplepresent','simplepast','questions','progressive'],Object.keys(g.TOPICS)]){g.state.trainMode=mode;g.state.selectedTopics=topics;const x=g.makeExam();r.push({mode,topics,n:x.ids.length,unique:new Set(x.ids).size,counts:topics.map(topic=>[topic,x.ids.filter(id=>x.assignments[id]===topic).length]),valid:x.ids.every(id=>(mode==='basic'?g.TASKS:g.FREE_TASKS).some(q=>q.id===id))})}return r});
 for(const x of exams){eq(x.n,Math.max(12,x.topics.length*2));eq(x.n,x.unique);ok(x.valid);x.counts.forEach(([topic,n])=>ok(n>=2,'exam '+topic))}
 // Practise through the UI: no assistance unlocks on empty input, and punctuation is separate.
 async function setTask(mode,id){await p.evaluate(({mode,id})=>{const g=GrammarTraining,q=(mode==='basic'?g.TASKS:g.FREE_TASKS).find(q=>q.id===id);g.state.trainMode=mode;g.state.selectedTopics=[q.topic];g.state.stats={started:1,first:0,retried:0,helped:0,skipped:0,unrecognised:0};g.state.train={id,value:'',picked:[],attempts:0,done:false,counted:false,hinted:false,feedback:'',feedbackKind:''};g.paintTraining(true);g.showTab('training')},{mode,id})}
 await setTask('free','KF-10');await p.locator('#trainCheck').click();ok(await p.locator('#trainHint').isHidden());await p.locator('#trainInput textarea').fill('Do you play basketball');await p.locator('#trainCheck').click();ok((await p.locator('#trainFeedback').textContent()).includes('Fragezeichen'));eq(await p.evaluate(()=>GrammarTraining.state.stats.first),0);
 await p.locator('#trainInput textarea').fill('Do you play basketball?');ok(await p.locator('#trainFeedback').isHidden(),'stale feedback cleared');await p.locator('#trainCheck').click();eq(await p.evaluate(()=>GrammarTraining.state.stats.retried),1);ok(await p.locator('#trainInput textarea').getAttribute('readonly')!==null,'completed response cannot retain a stale correct grade after editing');
 await setTask('basic','B-articles-1');await p.locator('#trainInput textarea').fill('a');await p.locator('#trainCheck').click();await p.locator('#trainHint').click();await p.locator('#trainInput textarea').fill('an');await p.locator('#trainCheck').click();eq(await p.evaluate(()=>GrammarTraining.state.stats.helped),1);eq(await p.evaluate(()=>GrammarTraining.state.stats.first),0);
 await setTask('free','KF-10');await p.locator('#trainInput textarea').fill('Unknown');await p.locator('#trainCheck').click();await p.locator('#trainSolution').click();eq(await p.evaluate(()=>GrammarTraining.state.stats.helped),1);eq(await p.evaluate(()=>GrammarTraining.state.stats.first),0);ok((await p.locator('#trainFeedback').textContent()).includes('nicht als selbstständige'));
 // Word sorting still works and completion disables the token controls.
 await setTask('basic','GT-33');for(const name of ['Where','did','Sam','go','yesterday?'])await p.locator('#trainInput .tokens').nth(1).getByRole('button',{name,exact:true}).click();await p.locator('#trainCheck').click();eq(await p.evaluate(()=>GrammarTraining.state.train.done),true);eq(await p.locator('#trainInput button:enabled').count(),0);
 // Exam sequence: model answers remain hidden until the end, and there are no duplicate tasks.
 await p.evaluate(()=>{const g=GrammarTraining;g.state.train=null;g.state.trainMode='free';g.state.selectedTopics=['articles'];g.state.exam=g.makeExam();g.showTab('check');g.paintExam(true)});
 for(let i=0;i<12;i++){const a=await p.evaluate(()=>{const g=GrammarTraining;return g.FREE_TASKS.find(q=>q.id===g.state.exam.ids[g.state.exam.i]).answers[0]});ok(await p.locator('#examResult').isHidden());await p.locator('#examInput textarea').fill(a);await p.locator('#examSubmit').click()}
 ok(await p.locator('#examResult').isVisible());ok((await p.locator('#examResult').textContent()).includes('Automatisch richtig: 12 von 12'));eq(await p.evaluate(()=>GrammarTraining.state.exam.results.every(r=>r.topic==='articles')),true);
 // Refresh and history keep the chosen page and the active answer.
 await setTask('free','KF-10');await p.locator('[data-tab="training"]').click();await p.locator('#trainInput textarea').fill('Do you play');await p.reload();eq(await p.locator('#trainInput textarea').inputValue(),'Do you play');
 await p.locator('[data-tab="nachschlagen"]').click();await p.goBack();ok(await p.locator('#training').isVisible());
 // Transfer uses the same quality rules and clears old feedback while editing.
 await p.locator('[data-tab="check"]').click();const first=p.locator('#transferTasks section').first();await first.locator('textarea').nth(0).fill('Where do you come from?');await first.locator('textarea').nth(1).fill('What do you like doing after school');await first.getByRole('button',{name:'Antworten prüfen',exact:true}).click();ok((await first.textContent()).includes('Fragezeichen'));await first.locator('textarea').nth(1).fill('What do you like doing after school?');await first.getByRole('button',{name:'Antworten prüfen',exact:true}).click();ok((await first.textContent()).includes('nach Überarbeitung'));
 // A corrupted empty topic selection cannot cause an infinite start loop.
 const c2=await b.newContext();await c2.addInitScript(()=>localStorage.setItem('engkompass_grammatiktraining_proto_v2',JSON.stringify({selectedTopics:[],trainMode:'basic'})));const p2=await c2.newPage();p2.on('pageerror',e=>errors.push(e.message));await p2.goto(origin+'/grammatiktraining.html#training');ok((await p2.locator('#trainTask').textContent()).length>10);await c2.close();
 for(const width of [1440,768,390,320]){await p.setViewportSize({width,height:900});for(const tab of ['lernen','training','check','nachschlagen']){await p.locator('[data-tab="'+tab+'"]').click();const dim=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));ok(dim.scroll<=dim.w+1,'No overflow at '+width+' '+tab)}}
 await p.setViewportSize({width:390,height:900});await p.locator('[data-tab="training"]').click();await p.screenshot({path:path.join(OUT,'training-mobile.png'),fullPage:true});await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:path.join(OUT,'training-desktop.png'),fullPage:true});
 eq(errors,[],'no browser errors');await b.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:true,assertions:checks,tasks:info.counts.reduce((a,b)=>a+b,0),answerVariants:info.answers.length,coverage:info.coverage,browserErrors:errors},null,2));
})().catch(e=>{console.error(e);process.exit(1)});

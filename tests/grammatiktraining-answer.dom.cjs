/* npm install --no-save --package-lock=false jsdom@26
 * node tests/grammatiktraining-answer.dom.cjs
 * Executes the current training code; covers grading and real DOM input flows.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const errors=[],vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/Could not parse CSS/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../grammatiktraining.html'),'utf8'),{url:'https://example.test/grammatiktraining.html',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window,d=w.document;w.structuredClone=structuredClone;w.scrollTo=()=>{};
for(const s of d.querySelectorAll('script'))if(!s.type||s.type==='text/javascript')w.eval(s.textContent);
const g=w.GrammarTraining;let assertions=0,models=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);assertions++}
const tasks=[...g.DATA.basic,...g.DATA.free,...g.DATA.comparisons.basic,...g.DATA.comparisons.free];
function grade(id,value){const q=tasks.find(q=>q.id===id);assert.ok(q,id);return g.diagnose(q,value).kind}
for(const q of tasks)for(const a of q.answers){eq(g.diagnose(q,a).kind,'correct',q.id+' model '+a);models++}
for(const [id,value,kind]of [
 ['GT-01','walks','correct'],['GT-02','went','correct'],['B-articles-1','an','correct'],['F-articles-4','an hour','correct'],
 ['B-pronouns-3','her','correct'],['GT-01','walk','unknown'],['B-articles-1','an apple','unknown'],
 ['RB-tobe-11',"Yes, I'm.",'error'],['RB-tobe-11','Yes, I am.','correct'],
 ['RB-tobe-11','Yes, I’m.','error'],['F-havegot-1',"She's got a brother.",'correct'],
 ['F-havegot-1','She’s got a brother.','correct'],['F-havegot-4',"They've got two cats.",'correct'],
 ['B-havegot-2',"I haven't got a bike.",'correct'],['F-tobe-1',"I'm happy today.",'correct'],
 ['KF-01','Mia plays tennis on fridays.','format'],['KF-01','mia plays tennis on Fridays.','format'],
 ['KF-01','Mia plays tennis on Fridays.','correct'],['KF-10','Do you play basketball','format'],
 ['KF-10','Do you play basketball??','format'],['KF-10','do you play basketball?','format'],
 ['KF-10','Do you play basketball?','correct'],['B-tobe-1','','empty'],
 ['QF-84','What did Ben did yesterday?','unknown']
]){eq(grade(id,value),kind,id+' '+value)}
// Canonicalisation must not merge possession, be, and incomplete short answers.
const q={format:'sentence',answers:['Yes, she is.'],explain:'',hint:''};
eq(g.diagnose(q,"Yes, she's.").kind,'error');
eq(g.diagnose({...q,answers:['She is happy.']},"She's happy.").kind,'correct');
eq(g.diagnose({...q,answers:['She has got a cat.']},"She's got a cat.").kind,'correct');
eq(g.diagnose({...q,answers:['She is singing.']},"She's singing.").kind,'correct');
eq(g.diagnose({...q,answers:['She has got a cat.']},'She is got a cat.').kind,'unknown');
eq(g.diagnose({...q,answers:['Yes, they have.']},"Yes, they've.").kind,'error');
eq(g.diagnose({...q,answers:['No, they have not.']},"No, they haven't.").kind,'correct');
eq(g.diagnose({...q,answers:['I saw Ben in London on Monday.']},'I saw ben in london on monday.').kind,'format');
eq(g.diagnose({...q,answers:['I saw Ben in London on Monday.']},'i saw Ben in London on Monday.').kind,'format');
// Every available scope/mode builds a unique twelve-task check.
for(const scope of ['topic','present-past','present-progressive'])for(const mode of ['basic','free']){
 g.state.scope=scope;g.state.mode=mode;const exam=g.makeExam();eq(exam.ids.length,12);eq(new Set(exam.ids).size,12);
}
// Submit the previously rejected gap answer through the actual training controls.
g.state.scope='topic';g.state.mode='basic';g.state.selected=['simplepresent'];
g.state.task={id:'GT-01',value:'',attempts:0,hinted:false,done:false,decision:null,decisionTries:0};
d.querySelector('[data-tab="training"]').click();
let field=d.querySelector('#trainInput textarea');
assert.ok(/Wort|Verbform/.test(d.querySelector('#responseGuide').textContent));assertions++;
field.value='walks';field.dispatchEvent(new w.Event('input',{bubbles:true}));d.querySelector('#trainCheck').click();
eq(g.state.task.done,true);eq(g.state.task.feedbackKind,'good');eq(d.querySelector('#trainInput textarea').readOnly,true);
// The same grader must reject an incomplete short answer in the learning check.
g.state.mode='basic';g.state.exam={ids:['RB-tobe-11'],i:0,results:[],value:'',finished:false,mode:'basic',scope:'topic',selected:['tobe']};
d.querySelector('[data-tab="check"]').click();field=d.querySelector('#examInput textarea');
field.value="Yes, I'm.";field.dispatchEvent(new w.Event('input',{bubbles:true}));d.querySelector('#examSubmit').click();
eq(g.state.exam.results[0].ok,false);eq(g.state.exam.results[0].diagnosis,'error');
eq(errors,[],'runtime errors');dom.window.close();
console.log(JSON.stringify({passed:true,assertions,models,tasks:tasks.length,scope:'DOM and answer grading; no visual-browser claim'}));

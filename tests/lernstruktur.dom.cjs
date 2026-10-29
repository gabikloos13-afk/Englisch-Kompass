/* Run with jsdom@26: verifies learning navigation and existing exercise initialization. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');const root=path.resolve(__dirname,'..');let checks=0;
const cases=[['adverbsoffrequency','aof'],['havegot','hg'],['pronouns','p'],['tobe','tobe'],['wordorder','wo'],['simplepresent','sp'],['simplepast','past'],['questions','q'],['articles'],['adjectives'],['thereisthereare']];
const ok=(v,m)=>{assert.ok(v,m);checks++};
(async()=>{for(const [name,group] of cases){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/CSS|scrollIntoView|window.scrollTo/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(path.join(root,name+'.html'),'utf8'),{url:'https://example.test/'+name+'.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,d=w.document;w.print=()=>{};w.confirm=()=>false;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const script of d.querySelectorAll('script')){if(script.type&&script.type!=='text/javascript')continue;if(script.src)continue;try{w.eval(script.textContent)}catch(e){errors.push(e.stack)}}
 await new Promise(r=>setTimeout(r,50));
 const special=name==='articles'||name==='adjectives';const target=d.querySelector(special?'#panel-schreibcheck':'#schreibcheck');
 ok(target,name+' has writing check');ok(target.closest(special?'#panel-verstehen':'#lernen'),name+' inside Lernen');
 const selector=special?'#study-lernen .step-tabs [data-step]':name==='thereisthereare'?'.learn-step-nav [data-step]':`#lernen .learn-step-nav [data-tab="${group}-learn"]`;
 let buttons=[...d.querySelectorAll(selector)];if(name==='questions')buttons=[...d.querySelectorAll('#lernen .learn-step-nav button')];
 ok(buttons.length>1,name+' learn navigation');const last=buttons.at(-1);ok(/Schreib.Check/.test(last.textContent),name+' check last');last.click();
 ok(target.classList.contains('is-active')||target.hidden===false,name+' check activates');
 if(name==='simplepast'){d.querySelector('button.sp-dz-v14-link').click();ok(d.querySelector('#past-learn-entry').classList.contains('is-active'),'Simple Past return to first learn step');}
 buttons[0].click();ok(special?target.hidden:!target.classList.contains('is-active'),name+' check deactivates');
 const main=d.querySelectorAll('.compass-mode-btn[data-val="writecheck"],.mode-btn[data-tab="schreibcheck"]');ok(!main.length,name+' no top-level writing check');
 ok(!errors.length,name+' script errors: '+errors.join('\n'));
 if(name==='adjectives')ok(d.querySelectorAll('#test-tasks .task-card').length>=12,'adjectives tasks initialized');
 if(name==='articles')ok(d.querySelectorAll('#test-tasks > *').length>=12,'articles tasks initialized');
 dom.window.close();
}console.log(JSON.stringify({passed:true,assertions:checks,topics:cases.length}));})().catch(e=>{console.error(e);process.exitCode=1});

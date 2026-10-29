/* Topic navigation, local drafts and feedback. No free-text mediation grading. */
(()=>{
 'use strict';
 const config=JSON.parse(document.getElementById('topic-config').textContent),$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const KEY='hanna_merkheft_'+config.topic+'_v1';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{}}catch{}
 const state={practice:saved.practice||{},order:Array.isArray(saved.order)?saved.order:[],page:0,filter:'all',nav:saved.nav||config.steps[0].id};let saveTimer,resetting=false;
 function write(){if(resetting)return;const fields={};$$('input[id],textarea[id],select[id]').forEach(el=>{fields[el.id]=el.type==='checkbox'?el.checked:el.value});try{localStorage.setItem(KEY,JSON.stringify({fields,practice:state.practice,order:state.order,nav:state.nav}));$('#save-status').textContent='Gespeichert.'}catch{$('#save-status').textContent='Nicht gespeichert.'}}
 function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(write,250)}
 function restoreFields(){for(const [id,value] of Object.entries(saved.fields||{})){const el=document.getElementById(id);if(!el||!el.matches('input,textarea,select'))continue;if(el.type==='checkbox')el.checked=!!value;else if(typeof value==='string')el.value=value}}
 function navigate(target,push=true){
  const known=[...config.steps.map(s=>s.id),'nachschlagen','verbindungen','notizen'];if(target==='lernen')target=config.steps[0].id;if(target==='schreibcheck')target=config.steps.at(-1).id;if(!known.includes(target))target=config.steps[0].id;
  const inLearn=config.steps.some(s=>s.id===target),mode=inLearn?'lernen':target;state.nav=target;
  $$('.compass-mode-panel').forEach(el=>{el.hidden=el.id!==mode});$$('.learn-panel').forEach(el=>{el.hidden=el.id!==target});$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.step===target)));
  if(push&&location.hash!=='#'+target)history.pushState(null,'','#'+target);queueSave();
 }
 $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.mode)));$$('[data-step]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.step)));window.addEventListener('popstate',()=>navigate(decodeURIComponent(location.hash.slice(1)),false));
 $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.goto)));
 $('#print-reference').addEventListener('click',()=>{document.body.classList.add('print-reference');window.print();document.body.classList.remove('print-reference')});window.addEventListener('afterprint',()=>document.body.classList.remove('print-reference'));
 $('#reset-topic').addEventListener('click',()=>{if(!confirm('Nur die Eingaben und Notizen auf dieser Themenseite löschen?'))return;resetting=true;clearTimeout(saveTimer);localStorage.removeItem(KEY);location.hash=config.steps[0].id;location.reload()});
 function feedback(el,text,kind=''){el.hidden=false;el.className='feedback'+(kind?' '+kind:'');el.textContent=text}
 function normalize(s){return String(s).replace(/[’‘]/g,"'").toLowerCase().replace(/[^a-z0-9'äöüß ]/g,' ').replace(/\s+/g,' ').trim()}
 function diagnose(q,value){
  if(!value.trim())return{status:'empty',message:'Schreibe zuerst deine eigene Frage.'};
  const match=q.answers.find(a=>normalize(a)===normalize(value));
  if(match){
   if(!/^[A-Z]/.test(value.trim())||!/\?\s*$/.test(value)||/\?\s*\?/.test(value))return{status:'format',message:'Die Wörter passen. Prüfe den großen Satzanfang und genau ein Fragezeichen am Ende.'};
   const names=(match.match(/\b(?:Mia|Ben|Emma|Lucy|Leo|Sam|Justin|Tom|Lily|Dad|Anna|Nora|Eva|London|Friday)\b/g)||[]);if(names.some(n=>new RegExp('\\b'+n.toLowerCase()+'\\b').test(value)))return{status:'format',message:'Die Frage passt inhaltlich. Schreibe Namen und Wochentage groß.'};
   return{status:'correct',message:'Die Frage passt zum Auftrag. '+(q.explain||'Begründe noch einmal: Welche Stelle wurde gesucht?')};
  }
  if(q.wrong&&q.wrong.some(a=>normalize(a)===normalize(value)))return{status:'error',message:'Prüfe noch einmal die gesuchte Stelle und die Verbform. Die Denkhilfe erklärt den nächsten Schritt.'};
  return{status:'unknown',message:'Diese Formulierung wurde nicht automatisch erkannt. Prüfe die gesuchte Information und den Bauplan. Du kannst anschließend mit einer möglichen Lösung vergleichen; weitere richtige Formulierungen sind möglich.'};
 }
 function shuffle(items){const copy=items.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
 if(config.bank){
  const bank=config.bank,ids=bank.map(q=>q.id);if(state.order.length!==ids.length||new Set(state.order).size!==ids.length||state.order.some(id=>!ids.includes(id)))state.order=shuffle(ids);
  const mount=$('#question-tasks');
  for(const q of bank){
   const card=document.createElement('article');card.className='task';card.dataset.task=q.id;
   card.innerHTML='<p class="task-heading"></p><p class="task-prompt"></p><label>Deine vollständige Frage<input type="text" autocomplete="off" spellcheck="false"></label><div class="actions"><button type="button" class="primary-btn" data-check>Prüfen</button><button type="button" class="secondary-btn" data-hint disabled>Denkhilfe</button><button type="button" class="secondary-btn" data-model disabled>Lösung vergleichen</button><button type="button" class="secondary-btn" data-retry>Neu versuchen</button></div><div class="feedback" role="status" hidden></div><div class="hint-box" hidden></div><div class="model" hidden></div>';
   $('.task-heading',card).textContent='Aufgabe '+(ids.indexOf(q.id)+1)+' · '+q.kind;$('.task-prompt',card).textContent=q.prompt;
   const input=$('input',card),fb=$('.feedback',card),hint=$('.hint-box',card),model=$('.model',card);input.id=q.id+'-input';input.closest('label').htmlFor=input.id;
   const ps=state.practice[q.id]||{attempted:false,assisted:false,status:'open'};state.practice[q.id]=ps;
   function unlock(on){$('[data-hint]',card).disabled=!on;$('[data-model]',card).disabled=!on}
   $('[data-check]',card).addEventListener('click',()=>{const r=diagnose(q,input.value);ps.attempted=r.status!=='empty';unlock(ps.attempted);ps.status=r.status==='correct'?(ps.assisted?'helped':'correct'):r.status;feedback(fb,(r.status==='correct'&&ps.assisted?'Mit Hilfe bearbeitet. ':'')+r.message,r.status==='correct'?'good':r.status==='format'?'format':r.status==='error'?'error':'');updateProgress();queueSave()});
   $('[data-hint]',card).addEventListener('click',()=>{if(!ps.attempted)return;ps.assisted=true;if(ps.status==='correct')ps.status='helped';hint.hidden=false;hint.textContent=q.hint;updateProgress();queueSave()});
   $('[data-model]',card).addEventListener('click',()=>{if(!ps.attempted)return;ps.assisted=true;ps.status='model';model.hidden=false;model.textContent='Mögliche Lösung: '+q.answers[0]+'\n'+(q.explain||'');feedback(fb,'Mit Musterlösung bearbeitet.');updateProgress();queueSave()});
   input.addEventListener('input',()=>{ps.attempted=false;ps.status='open';fb.hidden=true;hint.hidden=true;model.hidden=true;unlock(false);updateProgress()});
   input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('[data-check]',card).click()}});
   $('[data-retry]',card).addEventListener('click',()=>{input.value='';ps.attempted=false;ps.assisted=false;ps.status='open';fb.hidden=true;hint.hidden=true;model.hidden=true;unlock(false);input.focus();updateProgress();queueSave()});mount.append(card);
  }
  function updateProgress(){const all=Object.values(state.practice);$('#practice-progress').textContent=all.filter(x=>x.status==='correct').length+' selbstständig erkannt · '+all.filter(x=>x.status==='helped'||x.status==='model').length+' mit Hilfe bearbeitet.'}
  function showTasks(){const selected=state.order.map(id=>bank.find(q=>q.id===id)).filter(q=>state.filter==='all'||q.group===state.filter);const pages=Math.max(1,Math.ceil(selected.length/6));state.page=Math.min(state.page,pages-1);const visible=new Set(selected.slice(state.page*6,state.page*6+6).map(q=>q.id));$$('[data-task]').forEach(c=>{c.hidden=!visible.has(c.dataset.task)});$('#question-page').textContent='Aufgabenseite '+(state.page+1)+' von '+pages+' · '+selected.length+' Aufgaben';$('#previous-tasks').disabled=state.page===0;$('#next-tasks').disabled=state.page===pages-1;updateProgress()}
  $('#question-filter').addEventListener('change',e=>{state.filter=e.target.value;state.page=0;showTasks()});$('#previous-tasks').addEventListener('click',()=>{state.page--;showTasks()});$('#next-tasks').addEventListener('click',()=>{state.page++;showTasks()});showTasks();
 }
 if(config.comparisons){
  const select=$('#compare-case');config.comparisons.forEach((q,i)=>{const o=document.createElement('option');o.value=i;o.textContent=q.title;select.append(o)});
  let target='subject';function paint(){const q=config.comparisons[Number(select.value)||0];$('#compare-source').textContent=q.source;$('#compare-gap').textContent=q[target].gap;$('#compare-output').textContent=q[target].question;$('#compare-why').textContent=q[target].why;$$('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===target)))}
  $$('[data-role]').forEach(b=>b.addEventListener('click',()=>{target=b.dataset.role;paint()}));select.addEventListener('change',paint);paint();
 }
 if(config.selection){
  const root=$('#selection-facts'),s=config.selection;
  s.facts.forEach((fact,i)=>{const label=document.createElement('label');label.className='fact-choice';const cb=document.createElement('input');cb.type='checkbox';cb.id='fact-'+i;const text=document.createElement('span');text.textContent=(i+1)+'. '+fact;label.append(cb,text);root.append(label)});
  $('#selection-check').addEventListener('click',()=>{const chosen=$$('input',root).map((x,i)=>x.checked?i:-1).filter(i=>i>=0),expected=s.targets[$('#selection-recipient').value].indices,ok=chosen.length===expected.length&&chosen.every(i=>expected.includes(i));const el=$('#selection-feedback');feedback(el,ok?'Deine Auswahl passt zu diesem Auftrag. Lies die Begründung zu jeder Angabe.':'Vergleiche jede Angabe mit dem Auftrag: Wird sie gebraucht oder lenkt sie ab?',ok?'good':'');const ul=document.createElement('ul');ul.className='selection-result';s.facts.forEach((f,i)=>{const li=document.createElement('li');li.textContent=(i+1)+'. '+(expected.includes(i)?'Übernehmen: ':'Für diesen Auftrag weglassen: ')+s.targets[$('#selection-recipient').value].reasons[i];ul.append(li)});el.append(ul);queueSave()});
  $('#selection-recipient').addEventListener('change',()=>{$$('input',root).forEach(i=>i.checked=false);$('#selection-feedback').hidden=true});$$('input',root).forEach(i=>i.addEventListener('change',()=>$('#selection-feedback').hidden=true));
 }
 if(config.drafts){
  const mount=$('#draft-tasks');
  for(const q of config.drafts){
   const card=document.createElement('article');card.className='draft-task';card.dataset.draft=q.id;
   card.innerHTML='<p class="task-heading"></p><h3></h3><div class="learn-box thinking-box"><span class="card-label">Auftrag</span><div class="draft-prompt line-group"></div></div><div class="learn-box"><span class="card-label">Ausgangstext · eigenes Übungsbeispiel</span><p class="source-text"></p></div><label class="notes-label">1. Meine Stichpunkte<textarea rows="3" class="draft-notes"></textarea></label><label class="draft-label">2. Mein eigener Text<textarea rows="7" class="draft-input" spellcheck="true"></textarea></label><div class="actions"><button type="button" class="primary-btn" data-review>3. Mit Checkliste prüfen</button><button type="button" class="secondary-btn" data-draft-hint disabled>Denkhilfe</button><button type="button" class="secondary-btn" data-draft-model disabled>Mustertext vergleichen</button></div><div class="feedback" role="status" hidden></div><div class="hint-box" hidden></div><div class="review" hidden><h4>Meine eigene Kontrolle</h4><div class="criteria"></div><p class="review-progress" aria-live="polite"></p></div><div class="model" hidden></div>';
   $('.task-heading',card).textContent='Schreibauftrag '+q.number+' · '+q.direction;$('h3',card).textContent=q.title;
   q.prompt.forEach(t=>{const line=document.createElement('span');line.className='text-line';line.textContent=t;$('.draft-prompt',card).append(line)});$('.source-text',card).textContent=q.source;$('.source-text',card).lang=q.direction==='Deutsch → Englisch'?'de':'en';
   const notes=$('.draft-notes',card),input=$('.draft-input',card);notes.id=q.id+'-notes';input.id=q.id;input.lang=q.direction==='Deutsch → Englisch'?'en':'de';$('.notes-label',card).htmlFor=notes.id;$('.draft-label',card).htmlFor=input.id;
   q.criteria.forEach((t,i)=>{const label=document.createElement('label'),cb=document.createElement('input'),text=document.createElement('span');cb.type='checkbox';cb.id=q.id+'-criterion-'+i;text.textContent=t;label.append(cb,text);$('.criteria',card).append(label)});
   const fb=$('.feedback',card),review=$('.review',card),model=$('.model',card),hint=$('.hint-box',card);let attempted=false;
   function count(){const checks=$$('input[type=checkbox]',review);$('.review-progress',card).textContent='Meine Kontrolle: '+checks.filter(c=>c.checked).length+' / '+checks.length}
   $('[data-review]',card).id=q.checkId||q.id+'-check';$('[data-draft-hint]',card).id=q.hintId||q.id+'-hint';$('[data-draft-model]',card).id=q.modelId||q.id+'-model';
   $('[data-review]',card).addEventListener('click',()=>{if(!input.value.trim()){feedback(fb,'Dein Text fehlt noch.');return}attempted=true;review.hidden=false;$('[data-draft-hint]',card).disabled=false;$('[data-draft-model]',card).disabled=false;fb.hidden=true;count();queueSave()});
   $('[data-draft-hint]',card).addEventListener('click',()=>{if(!attempted)return;hint.hidden=false;hint.textContent=q.hint});
   $('[data-draft-model]',card).addEventListener('click',()=>{if(!attempted)return;model.hidden=false;model.textContent='Eine mögliche Formulierung:\n\n'+q.model});
   input.addEventListener('input',()=>{attempted=false;review.hidden=true;model.hidden=true;hint.hidden=true;fb.hidden=true;$('[data-draft-hint]',card).disabled=true;$('[data-draft-model]',card).disabled=true;$$('input[type=checkbox]',review).forEach(c=>c.checked=false)});$$('input[type=checkbox]',review).forEach(c=>c.addEventListener('change',count));mount.append(card);
  }
 }
 restoreFields();
 if(config.comparisons)$('#compare-case').dispatchEvent(new Event('change'));
 if(config.bank){state.filter=$('#question-filter').value;$('#question-filter').dispatchEvent(new Event('change'));for(const q of config.bank){const ps=state.practice[q.id];if(ps.status==='correct'&&diagnose(q,$('#'+q.id+'-input').value).status!=='correct'){ps.status='open';ps.attempted=false}}$('#practice-progress').textContent=Object.values(state.practice).filter(p=>p.status==='correct').length+' selbstständig gelöst.'}
 document.addEventListener('input',queueSave);document.addEventListener('change',queueSave);window.addEventListener('pagehide',write);
 navigate(decodeURIComponent(location.hash.slice(1))||state.nav,false);document.body.classList.add('js-ready');
 window.MerkheftLearning={config,bank:config.bank||[],normalize,diagnose,state,navigate};
})();

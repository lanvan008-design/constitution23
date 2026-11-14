import {TOPICS,CATEGORIES,KINDS,rng,shuffle,buildDeck,units,grade,recordAnswer,mastery,evidence} from './engine.mjs';

const $=s=>document.querySelector(s);
const KEY='constitution23-v1';
const fresh=()=>({version:1,xp:0,best:0,answered:0,correct:0,rounds:0,topics:{},errors:[],viewed:[],achievements:[]});
let state=fresh(),storageOk=true;
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.version===1&&s.topics&&Array.isArray(s.errors)&&Array.isArray(s.viewed)&&Array.isArray(s.achievements)&&['xp','best','answered','correct','rounds'].every(k=>Number.isFinite(s[k])&&s[k]>=0))state={...fresh(),...s};}catch{storageOk=false;}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOk=false;}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=id=>TOPICS.find(t=>t.id===id)?.title||'';
const topicById=id=>TOPICS.find(t=>t.id===id);
const iconPaths={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8l10-5Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/>',
 award:'<circle cx="12" cy="9" r="6"/><path d="m8 14-1 8 5-3 5 3-1-8"/>',
 spark:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1v16"/>',
 leaf:'<path d="M20 3c-7-1-16 2-16 9a7 7 0 0 0 7 7c7 0 10-9 9-16Z"/><path d="M3 22 15 10"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
 back:'<path d="M20 12H5m5-5-5 5 5 5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
 chart:'<path d="M4 20V4m0 16h17M8 15l4-5 4 2 5-7"/>',
 flag:'<path d="M5 22V3m0 0c6-4 8 4 15 0v11c-7 4-9-4-15 0"/>',
 shield:'<path d="m12 2 9 4v6c0 5-5 9-9 11-4-2-9-6-9-11V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
 shuffle:'<path d="M3 5h3l12 14h3M3 19h3l4-5m4-4 4-5h3M18 2l3 3-3 3m0 8 3 3-3 3"/>',
 repeat:'<path d="M20 7H7a4 4 0 0 0-4 4m1 6h13a4 4 0 0 0 4-4M17 3l4 4-4 4M7 13l-4 4 4 4"/>',
 share:'<path d="M12 16V2m-5 5 5-5 5 5M5 11H3v10h18V11h-2"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
 trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v7m-4 0h8"/>',
 list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h1m-1 7h1m-1 7h1"/>',
 heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 10 8 16 7-6 12-12 8-16Z"/>',
};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`;
function hydrate(){document.querySelectorAll('[data-icon]').forEach(n=>{n.innerHTML=icon(n.dataset.icon);});}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
let session=null,selection=[],assignments={},configTab='practice',configTopic='',category='all',study=null,lastResult=null,route=location.hash||'#home';
const pct=t=>mastery(state.topics[t.id],t);
const mastered=()=>TOPICS.filter(t=>pct(t)===100).length;
const totalProgress=()=>Math.round(TOPICS.reduce((a,t)=>a+pct(t),0)/TOPICS.length);
const plural=(n,forms)=>forms[n%10===1&&n%100!==11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2];
const nTasks=n=>`${n} ${plural(n,['задание','задания','заданий'])}`;
const ACHIEVEMENTS=[
 {id:'first',title:'Первый шаг',desc:'Дать первый правильный ответ.',icon:'leaf',test:()=>state.correct>=1},
 {id:'round',title:'В своём темпе',desc:'Завершить одну тренировку.',icon:'check',test:()=>state.rounds>=1},
 {id:'ten',title:'Хороший разгон',desc:'Пройти 10 заданий до первой ошибки.',icon:'bolt',test:()=>state.best>=10},
 {id:'twenty',title:'Есть чем гордиться',desc:'Пройти 20 заданий до первой ошибки.',icon:'trophy',test:()=>state.best>=20},
 {id:'five',title:'Есть система',desc:'Проверить все ключевые положения в 5 темах.',icon:'layers',test:()=>mastered()>=5},
 {id:'all',title:'Вся Конституция в деле',desc:'Проверить все ключевые положения в 47 темах.',icon:'award',test:()=>mastered()===TOPICS.length},
];
function unlock(){const list=ACHIEVEMENTS.filter(a=>!state.achievements.includes(a.id)&&a.test());state.achievements.push(...list.map(a=>a.id));save();return list;}
function render(html,nav='home'){
 const active=document.activeElement;const focusData=active?.matches('[data-action]')?{action:active.dataset.action,id:active.dataset.id,option:active.dataset.option}:null;
 document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===nav));$('#main').innerHTML=(!storageOk?'<div class="storage-banner">Браузер не разрешает сохранять прогресс. В этой вкладке тренажёр работает, но после закрытия результаты могут исчезнуть.</div>':'')+html;hydrate();
 if(focusData){const next=[...$('#main').querySelectorAll('[data-action]')].find(b=>b.dataset.action===focusData.action&&b.dataset.id===focusData.id&&b.dataset.option===focusData.option);if(next&&!next.disabled)next.focus({preventScroll:true});}
}
function tile(t,i){let p=pct(t);return `<button class="topic-tile" data-action="topic" data-id="${t.id}"><div class="tile-top"><span class="tile-num">${String(i+1).padStart(2,'0')}</span><span class="tile-arrow">↗</span></div><h3>${esc(t.title)}</h3><div class="bar"><span style="width:${p}%"></span></div><div class="tile-bottom"><span>${p===100?'Проверено':p>0?'Закрепляем':'Впереди знакомство'}</span><span>${p}%</span></div></button>`;}
function home(){
 const p=totalProgress();const date=new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',timeZone:'Europe/Moscow'}).format(new Date());
 render(`<div class="page-heading"><div><h1>Маленькие шаги. Большой результат.</h1><p>Конституционные характеристики для задания 23 ЕГЭ.</p></div><span class="date-tag">${icon('clock')}${date}</span></div>
 <section class="hero"><div class="hero-copy"><div class="eyebrow"><i></i> ПОНИМАНИЕ ПРИХОДИТ С ПРАКТИКОЙ</div><h2>Конституция.<br><em>Понятно и по делу.</em></h2><p>Узнавай признаки, находи подтверждения<br>и собирай уверенность — ответ за ответом.</p><div class="hero-bottom"><span>${icon('check')} Без письменных ответов</span><span>${icon('layers')} Вся база в одном месте</span></div></div><div class="hero-art" aria-label="Общий прогресс: ${p}%"><div class="orbit"></div><div class="float-label">${icon('book')} 47 тем · одна цель</div><div class="progress-disc"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="73"/><circle cx="80" cy="80" r="73" stroke-dasharray="${p*4.5867} 458.67"/></svg><div class="disc-text"><strong>${p}<small>%</small></strong><span>материала проверено</span></div></div><div class="float-label second">${icon('spark')} В твоём темпе</div></div></section>
 <section class="stats" aria-label="Мой прогресс"><div class="stat"><span class="stat-icon">${icon('layers')}</span><div><strong>${mastered()} <small>/ 47</small></strong><p>Тем проверено</p></div></div><div class="stat"><span class="stat-icon">${icon('bolt')}</span><div><strong>${state.xp}</strong><p>Очков опыта</p></div></div><div class="stat"><span class="stat-icon">${icon('trophy')}</span><div><strong>${state.best}</strong><p>Рекорд без ошибок</p></div></div><button class="stat" data-action="achievements"><span class="stat-icon">${icon('award')}</span><div><strong>${state.achievements.length} <small>/ 6</small></strong><p>Достижений ↗</p></div></button></section>
 <div class="section-heading"><h2>Как сегодня потренируемся?</h2><span class="section-kicker">ДВА РЕЖИМА · ОДНА БАЗА</span></div>
 <section class="mode-grid" aria-label="Режимы тренажёра"><article class="mode-card"><div class="mode-top"><div class="mode-icon">${icon('layers')}</div><span class="pill">В СВОЁМ ТЕМПЕ</span></div><h3>Тренировка</h3><p>Разбирай темы, выбирай подтверждения и учись на ошибках. Подсказки и объяснения рядом.</p><div class="mode-meta"><span>${icon('clock')} Длина по содержанию темы</span><span>${icon('heart')} Можно ошибаться</span></div><button class="btn" data-action="training">Начать тренировку ${icon('arrow')}</button></article>
 <article class="mode-card survival"><div class="mode-top"><div class="mode-icon">${icon('bolt')}</div><span class="pill">ЛИЧНЫЙ РЕКОРД</span></div><h3>До первой ошибки</h3><p>Как далеко ты пройдёшь? Один неверный ответ завершает забег. Поставь рекорд и поделись результатом.</p><div class="mode-meta"><span>${icon('target')} Без подсказок</span><span>${icon('trophy')} Твой рекорд: ${state.best}</span></div><button class="btn btn-lime" data-action="start-survival">Начать забег ${icon('arrow')}</button></article></section>
 <div class="section-heading"><h2>Твоя карта тем</h2><a class="text-button" href="#topics">Все 47 тем ${icon('arrow')}</a></div><section class="topic-preview">${[TOPICS[11],TOPICS[12],TOPICS[10]].map(t=>tile(t,TOPICS.indexOf(t))).join('')}</section>
 <p class="small-note inline-note">${icon('info')} Различай близкие понятия, замечай подмены условий и проверяй знания без однообразных повторов.</p>`);
}
function trainingConfig(){
 const topic=topicById(configTopic),count=topic?units(topic).length:null;
 render(`<button class="back" data-action="home">${icon('back')} К обзору</button><div class="intro"><div class="eyebrow muted">РЕЖИМ 01</div><h1 style="margin-top:12px">Тренировка</h1><p>Здесь можно разбираться, пробовать и ошибаться.</p></div><div class="config-layout"><section class="panel"><h2>Выбери свой темп</h2><div class="tabs" role="tablist" aria-label="Формат тренировки"><button role="tab" aria-selected="${configTab==='practice'}" class="tab ${configTab==='practice'?'selected':''}" data-action="config-tab" data-id="practice">Практика</button><button role="tab" aria-selected="${configTab==='cards'}" class="tab ${configTab==='cards'?'selected':''}" data-action="config-tab" data-id="cards">Карточки перед практикой</button></div><label class="field-label" for="topic-select">ЧТО ПОВТОРИМ?</label><select id="topic-select" class="select"><option value="">Все 47 тем вперемешку</option>${TOPICS.map(t=>`<option value="${t.id}" ${configTopic===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select><p class="config-desc">${configTab==='practice'?'Выбирай подтверждения, различай близкие понятия, находи ошибки и лишние утверждения. После ответа — объяснение.':'Вспомни подтверждения, затем открой карточку. К практике можно перейти в любой момент.'}</p><p class="config-desc">${topic?`В теме ${count} ${plural(count,['ключевое положение','ключевых положения','ключевых положений'])}. Объём тренировки соответствует содержанию темы.`:'Смешанный раунд — до 10 заданий. Успешно проверенное положение не повторяется под другим названием темы.'}</p><div class="config-actions"><button class="btn" data-action="start-training">${configTab==='practice'?(topic?'Тренировать тему':'Начать смешанный раунд'):'Открыть карточки'} ${icon('arrow')}</button>${state.errors.length?`<button class="btn btn-outline" data-action="start-errors">${icon('repeat')} Повторить ошибки · ${state.errors.length}</button>`:''}</div><p class="small-note">${configTab==='practice'?'За верный ответ — 10 XP. Ошибки сохранятся для отдельного повторения.':'Просмотр карточек отмечается отдельно и не повышает проверенный прогресс.'}</p></section><aside class="panel"><span class="stat-icon">${icon('target')}</span><h2 style="margin-top:18px">Важны тонкие различия</h2><ul class="check-list"><li>${icon('check')} Сравнивай близкие по смыслу характеристики.</li><li>${icon('check')} Следи за условиями: кто, в каких случаях и на каком основании.</li><li>${icon('check')} Находи подмены смысла, а не просто знакомые слова.</li></ul></aside></div>`);
}

function topicsPage(){
 const ts=category==='all'?TOPICS:TOPICS.filter(t=>t.category===category);
 render(`<button class="back" data-action="home">${icon('back')} К обзору</button><div class="intro"><h1>Карта тем</h1><p>47 тем. Выбирай любую — все открыты с первого дня.</p></div><div class="filter-row" role="group" aria-label="Разделы"><button class="chip ${category==='all'?'selected':''}" aria-pressed="${category==='all'}" data-action="filter" data-id="all">Все темы · 47</button>${Object.entries(CATEGORIES).map(([id,t])=>`<button class="chip ${category===id?'selected':''}" aria-pressed="${category===id}" data-action="filter" data-id="${id}">${t}</button>`).join('')}</div><section class="topic-grid">${ts.map(t=>tile(t,TOPICS.indexOf(t))).join('')}</section><p class="small-note inline-note">${icon('info')} Прогресс показывает долю проверенных смысловых положений. Количество повторов и просмотр карточек его не увеличивают.</p>`,'topics');
}
function achievements(){render(`<button class="back" data-action="home">${icon('back')} К обзору</button><div class="intro"><h1>Есть чем гордиться</h1><p>${state.achievements.length} из 6 достижений открыто. У каждого — свой маленький повод продолжать.</p></div><section class="achievement-grid">${ACHIEVEMENTS.map(a=>`<article class="achievement ${state.achievements.includes(a.id)?'unlocked':''}"><div class="badge">${icon(a.icon)}</div><h3>${a.title}</h3><p>${a.desc}</p><span>${state.achievements.includes(a.id)?'✓ Получено':'Пока впереди'}</span></article>`).join('')}</section>`,'achievements');}
function openTopic(id){
 const t=topicById(id);if(!t)return;const n=units(t).length;
 modal(`<h2>${esc(t.title)}</h2><p>${esc(t.variants[0])}</p><p class="small-note">${n} ${plural(n,['ключевое положение','ключевых положения','ключевых положений'])} · проверено ${pct(t)}%</p><div class="config-actions"><button class="btn" data-action="practice-topic" data-id="${id}">Тренировать ${icon('arrow')}</button><button class="btn btn-outline" data-action="study-topic" data-id="${id}">${icon('book')} Карточка</button></div>`);
}

function modal(html){const d=$('#dialog');d.innerHTML=`<button class="close" data-action="close-modal" aria-label="Закрыть">×</button>${html}`;if(!d.open)d.showModal();hydrate();}
function closeModal(){$('#dialog').close();}
function sourceModal(){modal(`<h2>О проекте</h2><p>Конституционные характеристики для задания 23 ЕГЭ по обществознанию. Два режима: тренировка и забег до первой ошибки.</p><p>Задания проверяют разные смысловые положения. Внутри одного раунда одинаковый смысл не задаётся повторно, даже если встречается в нескольких темах. Процент показывает долю проверенных положений.</p><p>Методическая основа: учебные материалы Независимой лаборатории образования Антона Чубукова.</p><p><a href="https://vk.com/club71258816" target="_blank" rel="noopener noreferrer">Об авторе учебных материалов ↗</a></p><p>Рекорды и прогресс сохраняются на этом устройстве. Общего онлайн-рейтинга в этой версии нет.</p><button class="btn btn-outline" data-action="reset-dialog">Сбросить мой прогресс</button>`);}

function startStudy(id=''){
 closeModal();study={items:id?[topicById(id)]:shuffle(TOPICS),index:0,open:false,variant:0};setHash('#cards');renderStudy();
}
function renderStudy(){
 if(!study){trainingConfig();return;}const t=study.items[study.index];
 render(`<div class="session-top"><button class="back" data-action="training">${icon('back')} К тренировке</button><span class="session-label">${icon('book')} КАРТОЧКИ</span><span class="session-counter">${study.index+1} / ${study.items.length}</span></div><div class="study-card"><div class="question-meta"><span class="eyebrow">${esc(t.title)}</span><span class="pill">${units(t).length} ${plural(units(t).length,['ПОЛОЖЕНИЕ','ПОЛОЖЕНИЯ','ПОЛОЖЕНИЙ'])}</span></div><h1>${esc(t.variants[study.variant%t.variants.length])}</h1>${t.variants.length>1?`<button class="text-button" data-action="study-variant">${icon('shuffle')} Другая формулировка · ${study.variant%t.variants.length+1}/${t.variants.length}</button>`:''}<div style="margin-top:24px">${study.open?`<ol class="study-answers">${units(t).map((u,i)=>`<li><strong class="muted">${i+1}.</strong> ${esc(u.text)}</li>`).join('')}</ol>`:`<div class="study-cover"><div><p>Какие положения подтверждают эту характеристику?<br>Вспомни их, затем переверни карточку.</p><button class="btn" data-action="study-reveal">Показать подтверждения ${icon('arrow')}</button></div></div>`}</div><div class="study-actions"><button class="btn btn-outline" data-action="practice-topic" data-id="${t.id}">${icon('target')} Проверить себя</button>${study.items.length>1?`<button class="btn" data-action="study-next">Следующая карточка ${icon('arrow')}</button>`:'<a class="btn" href="#topics">К другим темам →</a>'}</div></div><p class="small-note inline-note">${icon('info')} Карточка знакомит с материалом. Для проверки знаний переходи к практике.</p>`);
}

function setHash(h){route=h;history.replaceState(null,'',h);}
function startSession(mode,topicId=null,errorsOnly=false){
 closeModal();const seed=(Date.now()^Math.floor(Math.random()*1e9))>>>0;
 const plan=buildDeck({mode,topicId,topicIds:errorsOnly?[...state.errors]:null,random:rng(seed),progress:mode==='survival'?{}:state.topics});
 if(!plan.length){toast('Здесь пока нет заданий для повторения. Выбери другую тему.');return;}
 session={mode,topicId,index:0,score:0,results:[],plan,checked:false,q:null,xp:0,bestBefore:state.best,ended:false,newBadges:[]};
 selection=[];assignments={};setHash('#run');nextQuestion();window.scrollTo(0,0);
}

function nextQuestion(){
 const s=session;if(!s)return;
 if(s.index>=s.plan.length){if(s.mode==='training')state.rounds++;s.newBadges.push(...unlock());save();endSession(false,true);return;}
 s.q=s.plan[s.index];s.checked=false;selection=[];assignments={};renderQuestion();
}

function sessionAside(){const s=session;return `<aside class="quiz-aside"><h3>${s.mode==='survival'?'Держи темп':'Внимание к деталям'}</h3><p>${s.mode==='survival'?'Одна ошибка завершает забег. Каждый вопрос проверяет новый смысл.':'Сравнивай круг лиц, условия и правовые основания. Одна формулировка может отличаться важным словом.'}</p><div class="mini-stat"><strong>${s.score}</strong><span>${s.mode==='survival'?'ПРОЙДЕНО БЕЗ ОШИБОК':'ВЕРНЫХ ОТВЕТОВ'}</span></div><div class="mini-stat"><strong>${s.mode==='survival'?state.best:s.xp}</strong><span>${s.mode==='survival'?'ЛИЧНЫЙ РЕКОРД':'XP ЗА ТРЕНИРОВКУ'}</span></div>${s.mode==='training'?`<div class="round-dots">${Array.from({length:s.plan.length},(_,i)=>`<span class="${s.results[i]===true?'ok':s.results[i]===false?'miss':i===s.index?'current':''}"></span>`).join('')}</div>`:''}</aside>`;}

function responseReady(q){return q.kind==='classify'?q.options.every(o=>assignments[o.key]):selection.length===q.need;}
function questionOptions(q){
 const s=session;
 if(q.kind==='classify')return q.options.map((o,i)=>`<div class="classify-card"><p><span class="muted">${i+1}.</span> ${esc(o.text)}</p><div class="classify-buttons">${q.categories.map(c=>`<button data-action="classify" data-option="${o.key}" data-id="${c.id}" aria-pressed="${assignments[o.key]===c.id}" class="${assignments[o.key]===c.id?'selected':''} ${s.checked?(c.id===o.categoryId?'correct':assignments[o.key]===c.id?'wrong':''):''}" ${s.checked?'disabled':''}>${esc(c.title)}</button>`).join('')}</div></div>`).join('');
 let slots=q.kind==='assemble'?`<div class="answer-slots">${Array.from({length:q.need},(_,i)=>{const o=q.options.find(o=>o.key===selection[i]);return `<button class="answer-slot ${o?'filled':''}" data-action="remove-slot" data-id="${i}" ${s.checked||!o?'disabled':''}><span>${i+1}.</span> ${o?esc(o.text):'Выбери подтверждение ниже'}${o&&!s.checked?'<span>×</span>':''}</button>`;}).join('')}</div>`:'';
 return slots+`<div class="options" role="group" aria-label="Варианты ответа">${q.options.map((o,i)=>`<button class="option ${selection.includes(o.key)?'selected':''} ${s.checked?(o.correct?'correct':selection.includes(o.key)?'wrong':''):''}" data-action="select-option" data-id="${o.key}" aria-pressed="${selection.includes(o.key)}" ${s.checked?'disabled':''}><span class="option-number">${s.checked&&o.correct?'✓':selection.includes(o.key)?'✓':i+1}</span><span>${s.checked&&o.correct&&['error','odd'].includes(q.kind)?`<strong class="option-tag">${q.kind==='error'?'Ошибочное утверждение':'Лишнее утверждение'}</strong>`:''}${esc(o.text)}</span></button>`).join('')}</div>`;
}
function answerExplanation(q){
 if(q.kind==='classify')return q.options.map(o=>`<li><strong>${esc(q.categories.find(c=>c.id===o.categoryId)?.title)}:</strong> ${esc(o.text)}</li>`).join('');
 return evidence(q).map(o=>`<li>${esc(o.text)}</li>`).join('');
}

function questionFeedback(q,ok){
 const chosen=q.options.find(o=>o.correct);
 const specific=q.kind==='error'?`<p class="false-claim"><strong>Ошибочное утверждение:</strong> ${esc(chosen.text)}</p><p><strong>Правильно:</strong> ${esc(q.correction)}</p>`:q.kind==='odd'?`<p><strong>Лишнее:</strong> ${esc(chosen.text)}</p><p>Это положение раскрывает тему «${esc(q.extraTopic)}». Остальные относятся к заданной характеристике.</p>`:q.kind==='reverse'?`<p><strong>Правильная характеристика:</strong> ${esc(chosen.text)}</p>`:'';
 return `<div class="feedback ${ok?'':'failure'}" role="status"><h3>${icon(ok?'check':'info')}${ok?(q.kind==='error'?'Верно, ошибка найдена.':q.kind==='odd'?'Верно, лишнее найдено.':'Верно. Ещё один шаг вперёд.'):'Разберём и запомним.'}</h3>${specific}${q.reason?`<p style="margin-top:10px">${esc(q.reason)}</p>`:''}${q.kind!=='error'?`<ul>${answerExplanation(q)}</ul>`:''}</div>`;
}

function renderQuestion(){
 const s=session;if(!s||s.ended)return;const q=s.q;let count=s.mode==='training'?`${s.index+1} <span class="muted">/ ${s.plan.length}</span>`:`${s.score} <span class="muted">подряд</span>`;
 render(`<div class="session-top"><button class="back" data-action="quit">${icon('back')} Завершить</button><span class="session-label">${icon(s.mode==='survival'?'bolt':'layers')}${s.mode==='survival'?'ДО ПЕРВОЙ ОШИБКИ':'ТРЕНИРОВКА'}</span><span class="session-counter"><strong>${count}</strong></span></div><div class="session-progress"><span style="width:${s.mode==='training'?(s.index/s.plan.length)*100:Math.min(100,s.score%10*10)}%"></span></div><div class="quiz-layout"><section class="panel question-panel"><div class="question-meta"><span class="kind-label">${icon(q.kind==='classify'?'layers':q.kind==='assemble'?'list':'target')}${KINDS[q.kind]}</span><span class="pill">${s.mode==='survival'?'ЗАДАНИЕ '+(s.index+1):'+'+10+' XP'}</span></div><h1>${esc(q.title)}</h1><p class="question-prompt">${esc(q.prompt)}</p><p class="instruction">${esc(q.instruction)}</p>${questionOptions(q)}${s.checked?questionFeedback(q,s.results[s.index]):''}<div class="quiz-actions"><span class="small-note">${s.checked?'+ '+(s.results[s.index]?10:0)+' XP':q.kind==='classify'?Object.keys(assignments).length+' / 3 распределено':selection.length+' / '+q.need+' выбрано'}</span><button class="btn" data-action="${s.checked?'next':'check'}" ${!s.checked&&!responseReady(q)?'disabled':''}>${s.checked?(s.mode==='training'&&s.index===s.plan.length-1?'Завершить тренировку':'Продолжить'):'Проверить'} ${icon('arrow')}</button></div></section>${sessionAside()}</div>`);
}
function checkAnswer(){
 const s=session;if(!s||s.checked||s.ended||!responseReady(s.q))return;
 const q=s.q,ok=grade(q,q.kind==='classify'?assignments:selection);s.checked=true;s.results.push(ok);
 recordAnswer(state,q,ok,q.kind==='classify'?assignments:selection);
 if(ok){s.score++;s.xp+=10;state.xp+=10;if(s.mode==='survival')state.best=Math.max(state.best,s.score);}
 s.newBadges.push(...unlock());save();
 if(!ok&&s.mode==='survival'){endSession();window.scrollTo(0,0);}else{renderQuestion();const f=$('.feedback');f?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
}
function endSession(abandoned=false,completed=false){
 const s=session;if(!s)return;s.ended=true;
 lastResult={mode:s.mode,topicId:s.topicId,score:s.score,total:s.results.length,xp:s.xp,record:state.best,newRecord:s.mode==='survival'&&s.score>s.bestBefore,newBadges:s.newBadges,failed:s.results.at(-1)===false?s.q:null,abandoned,completed};
 setHash('#result');renderResult();
}

function renderResult(){
 const r=lastResult;if(!r){home();return;}const isSurvival=r.mode==='survival',oneTopic=r.topicId&&topicById(r.topicId);
 const heading=isSurvival?(r.completed?'Весь маршрут пройден!':r.newRecord?'Твой новый рекорд!':'Хороший забег.'):(r.score===r.total?'Всё верно!':'Есть что закрепить.');
 render(`<section class="results"><div class="result-icon">${icon(isSurvival?'trophy':'leaf')}</div><div class="eyebrow">${isSurvival?'ДО ПЕРВОЙ ОШИБКИ':'ТРЕНИРОВКА ЗАВЕРШЕНА'}</div><h1>${heading}</h1><p>${isSurvival?(r.completed?'Ты прошёл все задания без ошибки.':r.abandoned?'Ты завершил забег. Результат сохранён.':'Первая ошибка завершила забег. Разберись в отличии и попробуй снова.'):(oneTopic?`Тема: ${esc(oneTopic.title)}.`:'Каждое задание проверило новое положение.')}</p><div class="result-score">${r.score}${!isSurvival?`<small> / ${r.total}</small>`:''}</div><div class="result-caption">${isSurvival?plural(r.score,['задание без ошибок','задания без ошибок','заданий без ошибок']):'верных ответов в тренировке'}</div>${r.newRecord?`<span class="new-record">${icon('trophy')} Личный рекорд обновлён</span>`:''}${oneTopic&&units(oneTopic).length===1?'<p class="small-note">В этой теме одно ключевое положение. Проверили его — можно двигаться дальше.</p>':''}<div class="result-stats"><div><strong>+${r.xp}</strong><span>ОЧКОВ ОПЫТА</span></div><div><strong>${state.best}</strong><span>РЕКОРД БЕЗ ОШИБОК</span></div><div><strong>${totalProgress()}%</strong><span>МАТЕРИАЛА ПРОВЕРЕНО</span></div></div>${r.newBadges.length?`<div class="achieved-toast">${icon('award')} Открыто: ${r.newBadges.map(a=>esc(a.title)).join(', ')}</div>`:''}<div class="result-actions">${isSurvival?`<button class="btn" data-action="share">${icon('share')} Поделиться результатом</button><button class="btn btn-outline" data-action="download">${icon('download')} Карточка результата</button>`:''}<button class="btn ${isSurvival?'btn-outline':''}" data-action="${isSurvival?'start-survival':'start-another-training'}">${icon('repeat')} ${isSurvival?'Ещё один забег':'Смешанная тренировка'}</button>${oneTopic?'<a class="btn btn-outline" href="#topics">Другие темы</a>':''}<button class="btn btn-outline" data-action="home">К обзору</button></div>${isSurvival&&r.failed?`<div class="feedback failure"><h3>${icon('info')} На чём закончился забег</h3><p><strong>${esc(r.failed.title)}</strong></p><p>${esc(r.failed.prompt)}</p>${r.failed.kind==='error'?`<p><strong>Ошибочное утверждение:</strong> ${esc(r.failed.options.find(o=>o.correct).text)}</p><p><strong>Правильно:</strong> ${esc(r.failed.correction)}</p>`:r.failed.kind==='odd'?`<p><strong>Лишнее:</strong> ${esc(r.failed.options.find(o=>o.correct).text)}</p>`:r.failed.kind==='reverse'?`<p><strong>Правильная характеристика:</strong> ${esc(r.failed.options.find(o=>o.correct).text)}</p>`:''}${r.failed.reason?`<p>${esc(r.failed.reason)}</p>`:''}<ul>${answerExplanation(r.failed)}</ul><button class="text-button" style="margin-top:16px" data-action="practice-topic" data-id="${r.failed.topicId}">Закрепить в тренировке ${icon('arrow')}</button></div>`:''}<p class="result-tip">${isSurvival?'Отправь результат преподавателю или друзьям.':(r.score<r.total?'Ошибки сохранены. Их можно повторить отдельно из настроек тренировки.':'Выбирай следующую тему или смешанный раунд.')}<br>Рекорд хранится на этом устройстве. Общего онлайн-рейтинга пока нет.</p></section>`);
}

function shareText(){const r=lastResult;return `Мой результат в «Конституция · 23»: ${nTasks(r.score)} до первой ошибки! Личный рекорд — ${nTasks(state.best)}. Кто пройдёт дальше?\n${location.href.split('#')[0]}`;}
async function share(){const text=shareText();try{if(navigator.share){await navigator.share({title:'Конституция · 23 — мой результат',text});return;}await navigator.clipboard.writeText(text);toast('Результат скопирован — можно отправлять!');}catch(e){if(e.name==='AbortError')return;modal(`<h2>Поделиться результатом</h2><p>Скопируй текст и отправь преподавателю или друзьям.</p><p class="share-text">${esc(text).replaceAll('\n','<br>')}</p>`);}}
function downloadCard(){
 const c=document.createElement('canvas');c.width=1080;c.height=1080;const x=c.getContext('2d');
 x.fillStyle='#eaf0e1';x.fillRect(0,0,1080,1080);x.strokeStyle='#d7e2c9';x.lineWidth=2;[380,440,500].forEach(r=>{x.beginPath();x.arc(900,260,r,0,Math.PI*2);x.stroke();});
 x.fillStyle='#284c40';x.fillRect(64,65,100,100);x.fillStyle='#d9efa1';x.font='bold 63px Arial';x.textAlign='center';x.fillText('23',114,137);x.textAlign='left';x.fillStyle='#284c40';x.font='bold 34px Arial';x.fillText('КОНСТИТУЦИЯ · 23',191,128);
 x.font='25px Arial';x.fillStyle='#71845f';x.fillText('ДО ПЕРВОЙ ОШИБКИ',68,264);x.fillStyle='#284c40';x.font='bold 240px Arial';x.fillText(String(lastResult.score),58,535);x.font='38px Arial';x.fillText(plural(lastResult.score,['задание без ошибок','задания без ошибок','заданий без ошибок']),70,603);
 x.fillStyle='#284c40';x.fillRect(68,675,944,129);x.fillStyle='#d9efa1';x.font='bold 30px Arial';x.fillText('ЛИЧНЫЙ РЕКОРД',101,728);x.font='34px Arial';x.fillText(nTasks(state.best),101,775);
 x.fillStyle='#526b43';x.font='35px Arial';x.fillText('Кто пройдёт дальше?',70,883);x.font='22px Arial';x.fillStyle='#7a8b6b';x.fillText('ЕГЭ · Обществознание · Конституционные характеристики',70,959);x.font='18px Arial';const url=location.host+location.pathname;x.fillText(url.length>75?url.slice(0,72)+'…':url,70,1005);
 const image=c.toDataURL('image/png');modal(`<h2>Твой результат — одной карточкой</h2><img src="${image}" alt="Мой результат: ${nTasks(lastResult.score)} до первой ошибки" style="width:100%;border-radius:12px;display:block"><a class="btn" style="width:100%;margin-top:16px" href="${image}" download="constitution23-result-${lastResult.score}.png">${icon('download')} Сохранить изображение</a><p style="margin-top:12px">Отправь карточку преподавателю или друзьям.</p>`);
}
function navigate(h){if(session&&!session.ended&&route==='#run'){modal(`<h2>Завершить ${session.mode==='survival'?'забег':'тренировку'}?</h2><p>Полученный опыт и личный рекорд сохранятся.</p><div class="config-actions"><button class="btn" data-action="confirm-quit" data-id="${esc(h)}">Завершить</button><button class="btn btn-outline" data-action="close-modal">Продолжить</button></div>`);return;}location.hash=h;}
function routePage(){route=location.hash||'#home';if(route==='#topics')topicsPage();else if(route==='#achievements')achievements();else if(route.startsWith('#training')){const id=route.split('/')[1];if(id&&topicById(id))configTopic=id;trainingConfig();}else if(route==='#run'&&session&&!session.ended)renderQuestion();else if(route==='#cards'&&study)renderStudy();else if(route==='#result'&&lastResult)renderResult();else home();}
document.addEventListener('click',async e=>{
 const link=e.target.closest('a[href^="#"]');if(link&&!link.classList.contains('skip')&&session&&!session.ended&&route==='#run'){e.preventDefault();navigate(link.getAttribute('href'));return;}
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const id=b.dataset.id,action=b.dataset.action;
 if(action==='home'){closeModal();session=null;location.hash='#home';home();}
 else if(action==='training'){study=null;configTab='practice';setHash('#training');trainingConfig();}
 else if(action==='achievements'){location.hash='#achievements';}
 else if(action==='source')sourceModal();
 else if(action==='close-modal')closeModal();
 else if(action==='topic')openTopic(id);
 else if(action==='filter'){category=id;topicsPage();}
 else if(action==='config-tab'){configTab=id;trainingConfig();}
 else if(action==='start-training'){if(configTab==='cards')startStudy(configTopic);else startSession('training',configTopic||null);}
 else if(action==='start-errors'){startSession('training',null,true);}
 else if(action==='start-another-training'){configTopic='';startSession('training');}
 else if(action==='practice-topic'){configTopic=id;startSession('training',id);}
 else if(action==='study-topic')startStudy(id);
 else if(action==='start-survival')startSession('survival');
 else if(action==='select-option'){
  if(session.checked||session.ended)return;const q=session.q;
  if(q.need===1)selection=[id];else if(selection.includes(id))selection=selection.filter(k=>k!==id);else if(selection.length<q.need)selection.push(id);else toast(`Выбрано ${q.need}. Сначала убери один вариант.`);
  const y=window.scrollY;renderQuestion();window.scrollTo(0,y);
 }
 else if(action==='remove-slot'){selection.splice(Number(id),1);const y=window.scrollY;renderQuestion();window.scrollTo(0,y);}
 else if(action==='classify'){if(session.checked)return;assignments[b.dataset.option]=id;const y=window.scrollY;renderQuestion();window.scrollTo(0,y);}
 else if(action==='check')checkAnswer();
 else if(action==='next'){session.index++;nextQuestion();window.scrollTo(0,0);}
 else if(action==='quit')navigate('#result');
 else if(action==='confirm-quit'){closeModal();if(id==='#result')endSession(true);else{session.ended=true;location.hash=id;routePage();}window.scrollTo(0,0);}
 else if(action==='study-reveal'){study.open=true;const t=study.items[study.index];state.viewed=[...new Set([...state.viewed,t.id])];save();renderStudy();}
 else if(action==='study-next'){study.index=(study.index+1)%study.items.length;study.open=false;study.variant=0;renderStudy();window.scrollTo(0,0);}
 else if(action==='study-variant'){study.variant++;renderStudy();}
 else if(action==='share')await share();
 else if(action==='download')downloadCard();
 else if(action==='reset-dialog')modal('<h2>Начать с чистого листа?</h2><p>Будут удалены очки, рекорд, достижения и прогресс тем на этом устройстве.</p><div class="config-actions"><button class="btn" data-action="reset">Да, сбросить прогресс</button><button class="btn btn-outline" data-action="close-modal">Отмена</button></div>');
 else if(action==='reset'){state=fresh();save();closeModal();session=null;setHash('#home');home();toast('Прогресс сброшен');}
});
document.addEventListener('change',e=>{if(e.target.id==='topic-select'){configTopic=e.target.value;trainingConfig();}});
window.addEventListener('hashchange',()=>{routePage();window.scrollTo(0,0);});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
routePage();hydrate();

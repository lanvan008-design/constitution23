import {DATA} from './data.mjs';
import {NEIGHBOURS,MISCONCEPTIONS,MISCONCEPTION_GROUPS,MISCONCEPTION_ALTERNATIVES,REASONS,CLASSIFICATION_SETS} from './pedagogy.mjs';
export const TOPICS=DATA.topics;
export const CATEGORIES={state:'Устройство государства',rights:'Права и свободы',economy:'Экономика и труд',society:'Человек и общество',culture:'Культура и образование',citizen:'Гражданин и государство'};
export const KINDS={single:'Выбор подтверждения',multi:'Несколько подтверждений',classify:'Классификация',assemble:'Сборка ответа',error:'Найди ошибку',odd:'Найди лишнее',reverse:'Узнай характеристику'};
export function rng(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,r=Math.random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export const pick=(a,r=Math.random)=>a[Math.floor(r()*a.length)];
export const normal=s=>s.toLowerCase().replaceAll('ё','е').replace(/\([^)]*\)/g,'').replace(/российск(?:ая|ой|ую) федераци[яию]|в рф|каждый имеет право|каждый вправе|каждому гарантируется/gi,'').replace(/[^а-яa-z0-9]/g,'');
export function conceptKey(text){
 const s=text.toLowerCase().replaceAll('ё','е');
 const shared=[
  ['innocence',/каждый обвиняемый.*невиновным/],['authorities',/государственную власть.*осуществл.*президент.*федеральное собрание/],
  ['rights-value',/человек, его права и свободы являются высшей ценностью/],['property-forms',/равным образом частная, государственная, муниципальная/],
  ['market',/единство экономического пространства.*свободное перемещение/],['business',/каждый.*предпринимательской.*не запрещ/],
  ['labour-choice',/каждый.*свободно распоряжаться своими способностями к труду/],['ownership',/каждый.*имущество в собственности.*владеть/],
  ['conscience',/гарантируется свобода совести.*вероисповедания/],['ideology',/никакая идеология не может/],['religion',/никакая религия не может/],
  ['religious-groups',/религиозные объединения отделены/],['parties',/признаются политическое многообразие.*многопартийность/],
  ['thought',/гарантируется свобода мысли и слова/],['beliefs',/никто не может быть принужден к выражению/],
  ['dignity',/ничто не может быть основанием для умаления достоинства/],['personal-liberty',/каждый имеет право на свободу и личную неприкосновенность/],
  ['home',/никто не вправе проникать в жилище против воли/],['family',/материнство и детство, семья находятся под защитой государства/],
  ['parents',/забота о детях, их воспитание.*равное право и обязанность родителей/],['voting',/граждане.*право избирать.*органы государственной власти/],
  ['elected',/граждане.*право быть избранными/],['service',/граждане.*равный доступ к государственной службе/],
  ['education',/каждый имеет право на образование/],['higher-education',/каждый.*на конкурсной основе бесплатно получить высшее образование/],
  ['free-education',/общедоступность и бесплатность дошкольного.*основного общего/],['creativity',/свобода литературного, художественного, научного/],
  ['labour-pay',/каждый имеет право на вознаграждение за труд без/],['labour-safety',/каждый имеет право на труд в условиях.*безопасности и гигиены/],
  ['unemployment',/каждый имеет право на защиту от безработицы/],['social-security',/гарантируется социальное обеспечение.*в случае болезни/],
  ['branches',/государственная власть.*осуществляется на основе разделения на законодательную/],
 ];
 for(const[key,re]of shared)if(re.test(s))return key;
 return normal(s.replace(/^(политическая|экономическая|духовная|биологические потребности|социальные потребности|духовные потребности):\s*/,''));
}
const byId=Object.fromEntries(TOPICS.map(t=>[t.id,t]));
export function units(t){const seen=new Set();return t.groups.flatMap((g,group)=>g.map((text,alternative)=>({key:`${t.id}-${group}-${alternative}`,text,topicId:t.id,group,alternative,concept:conceptKey(text)}))).filter(u=>{if(seen.has(u.concept))return false;seen.add(u.concept);return true;});}
function fromRef(ref){const[id,g]=ref.split(':');return units(byId[id]).find(u=>u.group===Number(g));}
export function knownConcepts(p,t){return p?.concepts||[...new Set((p?.groups||[]).filter(g=>t.groups[g]).map(g=>conceptKey(t.groups[g][0])))];}
function contrasts(t,r){
 const seen=new Set(units(t).map(u=>u.concept));
 const real=(NEIGHBOURS[t.id]||[]).map(fromRef).filter(Boolean).filter(u=>{if(seen.has(u.concept))return false;seen.add(u.concept);return true;}).map(u=>({...u,key:'contrast-'+u.key,correct:false,valid:true}));
 const falsehoods=(MISCONCEPTIONS[t.id]||[]).map((text,i)=>({key:`false-${t.id}-${i}`,text,correct:false,valid:false}));
 return shuffle(real.length>=2?real:falsehoods,r);
}
function questionBase(t,index){return{id:`q-${index}`,topicId:t.id,topicIds:[t.id],title:t.title,prompt:t.variants[0],reason:REASONS[t.id]||'',learning:[]};}
function classifiedQuestion(kind,t,index,r,seen){
 const eligible=CLASSIFICATION_SETS.map((set,setIndex)=>set.map((c,i)=>({...c,id:`class-${setIndex}-${i}`,available:c.refs.map(fromRef).filter(u=>u&&!seen.has(u.concept))}))).filter(set=>set.every(c=>c.available.length)&&set.some(c=>c.available.some(u=>u.topicId===t.id)));
 if(!eligible.length)return null;
 const set=pick(eligible,r),categories=shuffle(set.map(c=>({id:c.id,title:c.label})),r);
 if(kind==='reverse'){
  const c=pick(set.filter(c=>c.available.some(u=>u.topicId===t.id)),r),u=pick(c.available.filter(u=>u.topicId===t.id),r);
  return{...questionBase(t,index),kind,title:'Узнай характеристику',prompt:u.text,need:1,options:shuffle(categories.map(c2=>({key:c2.id,text:c2.title,correct:c2.id===c.id,valid:true})),r),answer:[c.id],learning:[u],instruction:'Выбери характеристику, содержание которой раскрывает это положение.'};
 }
 const options=shuffle(set.map(c=>({...pick(c.available,r),categoryId:c.id})),r);
 return{...questionBase(t,index),kind,title:'Различи близкие понятия',prompt:'Соотнеси каждое положение с подходящей характеристикой.',need:options.length,options,categories,answer:Object.fromEntries(options.map(u=>[u.key,u.categoryId])),learning:options,topicIds:[...new Set(options.map(u=>u.topicId))],instruction:'Нажми на характеристику под каждым положением. Важны точный смысл и условия.'};
}
export function makeQuestion({index=0,topicId=null,kind='single',random:r=Math.random,progress={},seen=new Set(),groupIndices=null}={}){
 const t=topicId?byId[topicId]:pick(TOPICS,r);if(!t)return null;
 let available=shuffle(units(t).filter(u=>!seen.has(u.concept)&&(!groupIndices||groupIndices.includes(u.group))),r);
 if(!available.length)return null;
 const known=knownConcepts(progress[t.id],t);available.sort((a,b)=>Number(known.includes(a.concept))-Number(known.includes(b.concept)));
 if(kind==='classify'||kind==='reverse'){const q=classifiedQuestion(kind,t,index,r,seen);if(q)return q;kind='single';}
 if(kind==='error'){
  const errors=(MISCONCEPTIONS[t.id]||[]).map((text,i)=>({text,index:i,group:(MISCONCEPTION_GROUPS[t.id]||[0,0])[i],alternative:MISCONCEPTION_ALTERNATIVES[t.id]?.[i]})).map(e=>({...e,unit:available.find(u=>u.group===e.group&&(e.alternative===undefined||u.alternative===e.alternative))})).filter(e=>e.unit);
  if(errors.length){
   const error=pick(errors,r),context=shuffle([...(NEIGHBOURS[t.id]||[]).map(fromRef).filter(Boolean),...units(t)],r).filter(u=>u.concept!==error.unit.concept);
   const seenContext=new Set();let truths=context.filter(u=>{if(seenContext.has(u.concept))return false;seenContext.add(u.concept);return true;}).slice(0,3);
   if(truths.length<2)truths=[error.unit,...truths];
   const options=shuffle([...truths.map(u=>({...u,correct:false,valid:true})),{key:`false-${t.id}-${error.index}`,text:error.text,correct:true,valid:false}],r);
   return{...questionBase(t,index),kind,title:'Найди ошибочное утверждение',prompt:t.title,need:1,options,answer:options.filter(o=>o.correct).map(o=>o.key),learning:[error.unit],instruction:'Одно утверждение содержит смысловую ошибку. Найди его: остальные положения верны.',correction:error.unit.text};
  }
  kind='single';
 }
 if(kind==='odd'&&!NEIGHBOURS[t.id])kind='multi';
 const max=kind==='single'?1:Math.min(3,available.length),groupSeen=new Set();
 const chosen=available.filter(u=>{if(['p8r2','p9r0'].includes(t.id)&&groupSeen.has(u.group))return false;groupSeen.add(u.group);return true;}).slice(0,max);
 if(chosen.length===1&&['multi','assemble'].includes(kind))kind='single';
 const base=questionBase(t,index);base.learning=chosen;
 if(t.id==='p4r0')base.prompt='Демократическое государство: народовластие и политическое многообразие.';
 if(kind==='odd'){
  const extra=pick(contrasts(t,r).filter(u=>u.valid),r);if(!extra)return makeQuestion({index,topicId:t.id,kind:'single',random:r,progress,seen});
  const options=shuffle([...chosen.map(u=>({...u,correct:false,valid:true})),{...extra,correct:true}],r);
  return{...base,kind,title:'Найди лишнее утверждение',prompt:t.title,need:1,options,answer:[extra.key],instruction:'Все положения верны. Одно из них раскрывает другую характеристику. Найди лишнее.',extraTopic:byId[extra.topicId]?.title};
 }
 const options=shuffle([...chosen.map(u=>({...u,correct:true,valid:true})),...contrasts(t,r).slice(0,kind==='single'?3:2)],r);
 return{...base,kind,need:chosen.length,options,answer:options.filter(o=>o.correct).map(o=>o.key),instruction:chosen.length===1?'Выбери положение, которое непосредственно раскрывает эту характеристику.':`Выбери ${chosen.length} положения, которые непосредственно раскрывают эту характеристику.`};
}
export function buildDeck({mode='training',topicId=null,topicIds=null,limit=10,random:r=Math.random,progress={}}={}){
 const deck=[],seen=new Set(),pool=topicId?[byId[topicId]]:topicIds?TOPICS.filter(t=>topicIds.includes(t.id)):TOPICS;
 const target=mode==='survival'?Infinity:topicId?Infinity:limit,order=shuffle(['single','multi','classify','assemble','error','odd','reverse'],r);
 for(let pass=0;pass<40&&deck.length<target;pass++){
  let added=0;
  for(const t of shuffle(pool,r)){
   if(!t||deck.length>=target)break;
   let kind=order[deck.length%order.length];if((topicId||topicIds)&&kind==='classify')kind='reverse';
   let q=makeQuestion({index:deck.length,topicId:t.id,kind,random:r,progress,seen});if(!q)continue;
   // Match the topic to the exercise format too, instead of degrading most slots to single choice.
   if(!topicId&&!topicIds&&q.kind!==kind){
    for(const candidate of shuffle(pool,r)){
     const alternative=makeQuestion({index:deck.length,topicId:candidate.id,kind,random:r,progress,seen});
     if(alternative?.kind===kind){q=alternative;break;}
    }
   }
   if(q.learning.some(u=>seen.has(u.concept)))throw new Error('Repeated concept in deck');
   q.learning.forEach(u=>seen.add(u.concept));deck.push(q);added++;
  }
  if(!added)break;
 }
 return deck;
}
export function grade(q,response){if(q.kind==='classify')return !!response&&q.options.every(o=>response[o.key]===o.categoryId);return Array.isArray(response)&&response.length===q.answer.length&&q.answer.every(k=>response.includes(k));}
export const evidence=q=>q.learning;
export function mastery(p,t){if(!p)return 0;const allowed=new Set(units(t).map(u=>u.concept));return Math.round(100*knownConcepts(p,t).filter(c=>allowed.has(c)).length/allowed.size);}
export function recordAnswer(state,q,ok,response=null){
 for(const id of new Set(q.learning.map(u=>u.topicId))){
  const t=byId[id],p=state.topics[id]||{correct:0,attempts:0,groups:[],kinds:[]};p.attempts++;p.concepts=knownConcepts(p,t);p.failedConcepts=p.failedConcepts||[];let allCorrect=true;
  for(const u of q.learning.filter(u=>u.topicId===id)){
   const right=q.kind==='classify'&&response?response[u.key]===u.categoryId:ok;
   if(right){p.concepts=[...new Set([...p.concepts,u.concept])];p.failedConcepts=p.failedConcepts.filter(c=>c!==u.concept);p.groups=[...new Set([...p.groups,u.group])];}
   else{allCorrect=false;p.concepts=p.concepts.filter(c=>c!==u.concept);p.failedConcepts=[...new Set([...p.failedConcepts,u.concept])];}
  }
  if(allCorrect){p.correct++;p.kinds=[...new Set([...p.kinds,q.kind])];}state.topics[id]=p;
  if(p.failedConcepts.length)state.errors=[...new Set([...state.errors,id])];else state.errors=state.errors.filter(x=>x!==id);
 }
 state.answered++;if(ok)state.correct++;return state;
}

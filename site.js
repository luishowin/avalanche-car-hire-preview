import {tripError,message} from './trip.js';
const base=new URL('.',import.meta.url).pathname;
const key=base+'avalanche.trip', params=new URLSearchParams(location.search);
function stored(){try{return JSON.parse(sessionStorage.getItem(key))||{}}catch{return {}}}
let trip=stored();
for(const k of ['service','start','end','pickup','dropoff']) if(params.has(k)) trip[k]=params.get(k);
if(params.has('pickup') && !params.has('dropoff')) trip.dropoff=trip.pickup;
if(!['self','driver'].includes(trip.service)) trip.service='self';
let category='';
const form=document.querySelector('[data-trip]'), car=document.querySelector('[data-car]');
const panel=document.querySelector('#enquiry');
function save(){try{sessionStorage.setItem(key,JSON.stringify(trip))}catch{}}
function refresh(){
  let visible=0;
  for(const card of document.querySelectorAll('.card')) {
    card.hidden=!card.dataset.services.split(' ').includes(trip.service) || Boolean(category&&card.dataset.category!==category);
    if(!card.hidden) visible++;
    const price=card.querySelector('[data-self]'),rate=price.dataset[trip.service];
    price.textContent=rate+(rate==='Request a quote'?'':' / day');
    for(const a of card.querySelectorAll('a')) a.href=base+'fleet/'+card.dataset.slug+'/?'+new URLSearchParams(trip);
  }
  const empty=document.querySelector('[data-empty]');if(empty)empty.hidden=visible>0;
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
  category=b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));
  refresh();
});
if(form){
  const f=form.elements;
  const supported=car?.dataset.services.split(' ')||['self','driver'];
  if(!supported.includes(trip.service)) trip.service=supported[0];
  for(const input of f.service){input.checked=input.value===trip.service;input.disabled=!supported.includes(input.value)}
  for(const k of ['start','end','pickup','dropoff'])f[k].value=trip[k]||'';
  f.different.checked=!!trip.dropoff&&trip.dropoff!==trip.pickup;
  function sync(){
    form.querySelector('.return-field').hidden=!f.different.checked;
    f.dropoff.required=f.different.checked;
    trip={service:f.service.value,start:f.start.value,end:f.end.value,pickup:f.pickup.value.trim(),dropoff:(f.different.checked?f.dropoff.value:f.pickup.value).trim()};
    f.start.min=new Date(Date.now()+10800000).toISOString().slice(0,16);
    f.end.min=trip.start||f.start.min;
    f.end.setCustomValidity(trip.start&&trip.end&&trip.end<=trip.start?'Return must be after pickup.':'');
    save();refresh();if(panel)panel.hidden=true;
  }
  sync(); form.addEventListener('input',sync);form.addEventListener('change',sync);
  form.onsubmit=ev=>{
    ev.preventDefault();sync();const error=tripError(trip);if(error){f.start.setCustomValidity(error);f.start.reportValidity();f.start.setCustomValidity('');return}
    if(!car){location.assign(base+'fleet/?'+new URLSearchParams(trip));return}
    const text=message(car.dataset.name,trip);
    panel.hidden=false;panel.querySelector('pre').textContent=text;
    const wa=document.body.dataset.wa,send=panel.querySelector('[data-send]'),status=panel.querySelector('[role=status]');
    send.hidden=!wa;
    if(wa)send.href='https://wa.me/'+wa+'?text='+encodeURIComponent(text);
    status.textContent=wa?'Tap Send in WhatsApp to deliver your enquiry.':'Preview mode. You can copy the enquiry while the business number is being confirmed.';
    panel.querySelector('[data-copy]').onclick=async()=>{
      try{await navigator.clipboard.writeText(text);status.textContent='Enquiry copied.'}catch{const range=document.createRange();range.selectNodeContents(panel.querySelector('pre'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Message selected. Use your device’s Copy action.'}
    };
    const apply=panel.querySelector('[data-apply]');apply.hidden=document.body.dataset.app!=='true';
    apply.href=base+'account/?'+new URLSearchParams({...trip,car:car.dataset.car});
    panel.scrollIntoView({block:'nearest'});
  };
}
refresh();
if('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register(base+'sw.js').catch(()=>{});

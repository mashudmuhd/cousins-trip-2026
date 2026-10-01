'use strict';
const $=s=>document.querySelector(s), API=window.TRIP_CONFIG.apiUrl, KEY='cousins-trip-2026-v1';
const labels={adult:'Adult (15+)',kid8to15:'Kid (8–15 Yrs)',kidBelow8:'Kid (Below 8)'};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizePhone=p=>{let d=String(p??'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d;};
function readCache(){try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(r=>r&&Array.isArray(r.members));}catch{return [];}}
let records=readCache(),memberId=0,saving=false,syncing=false,soundEnabled=false,audioContext,duplicatePhone='';
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));return true;}catch{notify('Device storage is unavailable. Please keep this page open until your registration is synced.');return false;}}
function normalize(r){const types={adult:'adult',kid8to15:'kid8to15',kidBelow8:'kidBelow8',kid:'kid8to15',child:'kid8to15',child8to15:'kid8to15',below8:'kidBelow8',infant:'kidBelow8',kid1:'kid8to15',kid2:'kidBelow8'};let members=r.membersList||r.members||[];if(typeof members==='string'){try{members=JSON.parse(members);}catch{members=[];}}if(!Array.isArray(members))members=[];return {ticketId:String(r.ticketId||r.id||''),phone:normalizePhone(r.phone),familyHead:String(r.familyHead||members[0]?.name||''),members:members.map(m=>({name:String(m.name||''),type:types[m.type||m.category]||'kid8to15'})),timestamp:r.timestamp||r.createdAt||'',pending:false,isTest:r.isTest===true};}
function isValidRecord(r){return /^\d{10}$/.test(r.phone)&&r.members.length>0&&!r.isTest;}
function play(kind='click'){if(!soundEnabled)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const notes=kind==='celebrate'?[523,659,784,1047]:kind==='add'?[660,880]:kind==='error'?[180,130]:[520];notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.11;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.25);});}catch{}}
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;$('#sound').setAttribute('aria-pressed',String(soundEnabled));$('#sound span').textContent=soundEnabled?'Sound on':'Sound muted';play();};
function switchTab(joined,focus=false){$('.tabs').classList.toggle('joined',joined);for(const [name,on]of [['register',!joined],['joined',joined]]){$(`#${name}-tab`).setAttribute('aria-selected',String(on));$(`#${name}-tab`).tabIndex=on?0:-1;$(`#${name}-panel`).hidden=!on;}if(joined){renderList();sync(false);}if(focus)$(joined?'#joined-tab':'#register-tab').focus();play();}
$('#register-tab').onclick=()=>switchTab(false);$('#joined-tab').onclick=()=>switchTab(true);$('.tabs').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();switchTab(e.key==='End'||(e.key!=='Home'&&$('#joined-tab').getAttribute('aria-selected')!=='true'),true);}};
function addMember(focus=true){const id=++memberId,first=!$('#members').children.length;const card=document.createElement('article');card.className='card member-card';card.dataset.id=id;card.innerHTML=`<div class="card-header"><span class="number"></span><div class="card-title">അംഗം<small>Member</small></div>${first?'':`<button class="remove" type="button" aria-label="Remove member">×</button>`}</div><label class="field-label" for="name-${id}">FULL NAME / പേര്</label><input id="name-${id}" class="name-input" autocomplete="${first?'name':'off'}" placeholder="Enter member’s name" maxlength="80" required><button type="button" class="field-next name-next">Next: choose age group</button><fieldset class="age-options"><legend class="field-label">AGE GROUP / പ്രായപരിധി</legend>${[['adult','മുതിർന്നവർ','Adult · 15+'],['kid8to15','കുട്ടി','8–15 വയസ്സ്'],['kidBelow8','കുട്ടി','8 വയസ്സിൽ താഴെ · Below 8']].map(([value,ml,en])=>`<label class="age-option"><input type="radio" name="age-${id}" value="${value}" required><span>${ml}<small>${en}</small></span></label>`).join('')}</fieldset>`;$('#members').append(card);card.querySelector('.remove')?.addEventListener('click',()=>{card.remove();renumber();validate();play();$('#add-member').focus();});renumber();validate();if(focus){card.querySelector('input').focus();play('add');}}
function renumber(){document.querySelectorAll('.member-card').forEach((c,i)=>{c.querySelector('.number').textContent=String(i+1).padStart(2,'0');});}
$('#add-member').onclick=()=>addMember();
function formMembers(){return [...document.querySelectorAll('.member-card')].map(c=>({name:c.querySelector('.name-input').value.trim(),type:c.querySelector('input[type=radio]:checked')?.value||''}));}
function duplicate(phone){return records.find(r=>r.phone===phone);}
function validate(){const members=formMembers(),phone=normalizePhone($('#phone').value);let message='✅ സമർപ്പിക്കാൻ തയ്യാറാണ്!';if(members.some(m=>!m.name))message='ഓരോ അംഗത്തിന്റെയും പേര് നൽകുക';else if(members.some(m=>!m.type))message='എല്ലാ അംഗങ്ങളുടെയും പ്രായപരിധി തിരഞ്ഞെടുക്കുക';else if(!members.some(m=>m.type==='adult'))message='ഒരു മുതിർന്ന അംഗത്തെയെങ്കിലും ചേർക്കുക';else if(!/^\d{10}$/.test(phone))message='തുടരാൻ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക';const valid=message.startsWith('✅');$('#form-status').textContent=saving?'Saving your family…':message;$('#form-status').classList.toggle('ready',valid&&!saving);$('#submit').disabled=!valid||saving;const exists=phone.length===10&&duplicate(phone);$('#phone-warning').hidden=!exists;$('#phone-warning').textContent=exists?'ഈ നമ്പറിൽ രജിസ്ട്രേഷൻ നിലവിലുണ്ട് · Already registered':'';return valid;}
$('#registration').addEventListener('input',validate);$('#registration').addEventListener('change',()=>{validate();play();});$('#phone').addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^\d\s]/g,'');});
function showDuplicate(r){duplicatePhone=r.phone;$('#duplicate-summary').innerHTML=`<strong>${escapeHtml(r.familyHead)}</strong><br>Ticket: ${escapeHtml(r.ticketId)}<br>Total members: ${r.members.length}`;$('#duplicate-dialog').showModal();play('error');}
$('#edit-phone').onclick=()=>{$('#duplicate-dialog').close();$('#phone').focus();};$('#view-duplicate').onclick=()=>{$('#duplicate-dialog').close();$('#search').value=duplicatePhone;switchTab(true);$('#search').focus();};
function renderList(){const all=records.filter(isValidRecord),members=all.flatMap(r=>r.members),adults=members.filter(m=>m.type==='adult').length;$('#count').textContent=members.length;$('#stats').innerHTML=[['Families',all.length],['Total',members.length],['Adults',adults],['Kids',members.length-adults]].map(([k,v])=>`<div class="metric"><strong>${v}</strong><span>${k}</span></div>`).join('');const query=$('#search').value.toLowerCase().trim(),shown=all.filter(r=>[r.familyHead,r.phone,r.ticketId,...r.members.map(m=>m.name)].join(' ').toLowerCase().includes(query));$('#joined-list').innerHTML=shown.length?shown.slice().reverse().map(r=>`<article class="card family-card"><div class="family-top"><span class="avatar">${escapeHtml(Array.from(r.familyHead)[0]?.toUpperCase()||'F')}</span><div><h3>${escapeHtml(r.familyHead)}</h3><p>+91 ${escapeHtml(r.phone)} · ${r.members.length} members</p></div><span class="ticket">${escapeHtml(r.ticketId)}</span></div><div class="chips">${r.members.map(m=>`<span class="chip ${m.type==='adult'?'':m.type==='kidBelow8'?'young':'kid'}">${escapeHtml(m.name)} · ${labels[m.type]||'Kid'}</span>`).join('')}</div><div class="family-bottom">${r.pending?'◷ Saved on this device · Waiting to sync':'✓ Confirmed'}${r.timestamp?' · '+escapeHtml(r.timestamp):''}</div></article>`).join(''):`<div class="card empty"><div class="empty-symbol">♧</div><h3>${query?'No matching families':'The first memory starts here.'}</h3><p>${query?'Try another name, phone number or ticket ID.':'Be the first to bring your people along.'}</p><button class="primary" id="empty-action">${query?'Clear search':'രജിസ്റ്റർ ചെയ്യുക · Register now'}</button></div>`;$('#empty-action')?.addEventListener('click',()=>{if(query){$('#search').value='';renderList();}else switchTab(false,true);});}
$('#search').addEventListener('input',renderList);
const network=window.createTripNetwork(API);
let hasLiveSnapshot=false,lastLiveRead=0;
async function getRemote(){return (await network.read()).map(normalize).filter(isValidRecord);}
function mergeRemote(remote){hasLiveSnapshot=true;lastLiveRead=Date.now();const pending=records.filter(r=>r.pending&&!remote.some(s=>s.phone===r.phone));records=[...remote,...pending];persist();renderList();validate();}
function payload(r){const adultCount=r.members.filter(m=>m.type==='adult').length,kid8to15Count=r.members.filter(m=>m.type==='kid8to15').length,kidBelow8Count=r.members.filter(m=>m.type==='kidBelow8').length;return {...r,totalCount:r.members.length,adultCount,kid8to15Count,kidBelow8Count,membersList:r.members,membersSummary:r.members.map((m,i)=>`${i+1}. ${m.name} (${labels[m.type]})`).join('\n')};}
async function post(r){const result=await network.write(payload(r));if(result.status==='duplicate'||result.code==='DUPLICATE')return {duplicate:true,data:result.data};if(result.status!=='success'&&result.success!==true)throw Error(result.message||'Registration sync could not be confirmed');return result;}
async function sync(retry=false){if(syncing||saving)return;syncing=true;$('#refresh').disabled=true;$('#sync-status').textContent='Refreshing…';$('#sync-status').classList.remove('live');if(!hasLiveSnapshot&&!records.length){$('#joined-list').innerHTML='<div class="card empty" role="status">Loading families from Google Sheets…</div>';}try{mergeRemote(await getRemote());if(retry&&records.some(r=>r.pending)){for(const r of records.filter(r=>r.pending)){await post(r);}mergeRemote(await getRemote());}const pending=records.some(r=>r.pending);$('#sync-status').textContent=pending?'Waiting to sync':'Live sync';$('#sync-status').classList.toggle('live',!pending);$('#list-message').textContent='Updated from Google Sheets · '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}catch{$('#sync-status').textContent='Could not refresh · cached data';$('#list-message').textContent='Could not refresh the family list. Your saved entries are still here. Tap Refresh to try again.';if(!hasLiveSnapshot&&!records.length){$('#joined-list').innerHTML='<div class="card empty">The family list could not be loaded. Tap Refresh to try again.</div>';}}finally{syncing=false;$('#refresh').disabled=false;}}
$('#refresh').onclick=()=>sync(true);

function notify(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').hidden=true,7000);}
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<64;i++){const c=document.createElement('i');c.className='confetti';const left=i%2===0;c.style.left=left?'0':'100%';c.style.top='65%';c.style.background=['#62edb1','#0bbad4','#e7c372','#edf9ef'][i%4];c.style.setProperty('--dx',`${(left?1:-1)*(80+Math.random()*innerWidth*.55)}px`);c.style.setProperty('--dy',`${-400+Math.random()*650}px`);document.body.append(c);setTimeout(()=>c.remove(),2000);}}
let tripAnimation,progressTimer,confirmedTicket,ticketExportPromise,ticketImageFile;
function showProgress(){
  const dialog=$('#trip-dialog');dialog.classList.remove('is-ticket');$('#ticket-brand').hidden=true;
  $('#trip-close').hidden=true;$('#trip-actions').hidden=true;$('#trip-details').hidden=true;$('#trip-success').hidden=true;$('#trip-progress').hidden=false;$('#trip-wait-note').hidden=false;
  $('#trip-kicker').textContent='A NEW MEMORY BEGINS';$('#trip-dialog-title').textContent='Saving your spot…';$('#trip-dialog-description').textContent='നിങ്ങളുടെ രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുന്നു.';
  dialog.setAttribute('aria-busy','true');dialog.showModal();$('#trip-dialog-title').focus();
  if(window.lottie&&!tripAnimation){try{tripAnimation=window.lottie.loadAnimation({container:$('#trip-lottie'),renderer:'svg',loop:true,autoplay:false,animationData:window.TRIP_PROGRESS_ANIMATION});}catch{}}
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)tripAnimation?.play();
  progressTimer=setTimeout(()=>{$('#trip-dialog-description').textContent='Google Sheets is taking a little longer. We’re still saving your family…';},8000);
}
function endProgress(){clearTimeout(progressTimer);tripAnimation?.pause();$('#trip-dialog').removeAttribute('aria-busy');}
function showWelcome(r){
  endProgress();$('#trip-dialog').classList.add('is-ticket');$('#ticket-brand').hidden=false;$('#trip-progress').hidden=true;$('#trip-success').hidden=false;$('#trip-kicker').textContent='REGISTRATION CONFIRMED';
  $('#trip-dialog-title').textContent='Welcome to the trip!';$('#trip-dialog-description').textContent='ഒരുമിച്ച് ഒരു യാത്ര. ഒരുപാട് ഓർമ്മകൾ.';
  const adults=r.members.filter(m=>m.type==='adult').length;
  $('#trip-details').innerHTML=`<div class="ticket-holder"><span class="ticket-label">FAMILY / കുടുംബം</span><strong>${escapeHtml(r.familyHead)}</strong></div><div class="ticket-grid"><div><span class="ticket-label">TRAVELLERS</span><strong>${String(r.members.length).padStart(2,'0')} <small>members</small></strong></div><div><span class="ticket-label">YOUR GROUP</span><strong>${adults} <small>adults</small> · ${r.members.length-adults} <small>kids</small></strong></div></div><div class="ticket-stub"><div><span class="ticket-label">TICKET NUMBER</span><strong>${escapeHtml(r.ticketId)}</strong></div><span class="ticket-confirmed">✓ Confirmed</span></div>`;$('#trip-details').hidden=false;
  confirmedTicket=JSON.parse(JSON.stringify(r));prepareTicketImage();$('#trip-actions').hidden=false;$('#trip-close').hidden=false;$('#trip-wait-note').hidden=true;$('#trip-dialog-title').focus();
}
function prepareTicketImage(){
  ticketImageFile=null;
  const button=$('#trip-share-image');button.disabled=true;button.querySelector('span').textContent='Preparing ticket image…';$('#ticket-share-status').textContent='';
  const snapshot=confirmedTicket;
  ticketExportPromise=window.createTicketPDF(snapshot);
  ticketExportPromise.then(async result=>{
    const blob=await new Promise((resolve,reject)=>result.canvas.toBlob(value=>value?resolve(value):reject(Error('Image export failed')),'image/png'));
    if(confirmedTicket!==snapshot)return;
    ticketImageFile=new File([blob],result.filename.replace(/\.pdf$/i,'.png'),{type:'image/png'});
    button.disabled=false;button.querySelector('span').textContent='Share ticket image';
    $('#ticket-share-status').textContent=navigator.canShare?.({files:[ticketImageFile]})?'Choose WhatsApp in your phone’s share menu.':'Your browser can save the image to attach in WhatsApp.';
  }).catch(()=>{if(confirmedTicket!==snapshot)return;ticketExportPromise=null;button.disabled=false;button.querySelector('span').textContent='Retry ticket image';$('#ticket-share-status').textContent='Image preparation failed. Tap to retry.';});
}
function saveTicketImage(){
  const url=URL.createObjectURL(ticketImageFile),link=document.createElement('a');link.href=url;link.download=ticketImageFile.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('#ticket-share-status').textContent='Ticket PNG saved. Open WhatsApp and attach it from Photos or Files.';
}
$('#trip-share-image').onclick=async()=>{
  if(!ticketImageFile){if(confirmedTicket)prepareTicketImage();return;}
  // The file is prepared before the tap, preserving the browser's share permission.
  if(navigator.share&&navigator.canShare?.({files:[ticketImageFile]})){
    try{await navigator.share({files:[ticketImageFile],title:'Cousins Trip 2026 ticket'});$('#ticket-share-status').textContent='';}
    catch(error){if(error.name!=='AbortError'){$('#ticket-share-status').textContent='Image sharing is unavailable. Saving the ticket so you can attach it in WhatsApp.';saveTicketImage();}}
  }else saveTicketImage();
};
$('#trip-download').onclick=async()=>{
  if(!confirmedTicket)return;
  const button=$('#trip-download'),label=button.querySelector('span');button.disabled=true;label.textContent='Preparing your PDF…';
  try{const result=await (ticketExportPromise||window.createTicketPDF(confirmedTicket));await result.pdf.save(result.filename,{returnPromise:true});}
  catch{notify('Could not download the PDF. Please try again.');}
  finally{button.disabled=false;label.innerHTML='Download Ticket<small>Save your trip pass as PDF</small>';}
};
$('#trip-dialog').addEventListener('cancel',e=>{if(saving)e.preventDefault();});
$('#trip-dialog').addEventListener('close',endProgress);
$('#trip-close').onclick=$('#trip-done').onclick=()=>{$('#trip-dialog').close();switchTab(true,true);};
$('#registration').addEventListener('submit',async e=>{
  e.preventDefault();if(saving||!validate())return;
  const phone=normalizePhone($('#phone').value),existing=duplicate(phone);
  if(existing){showDuplicate(existing);return;}
  const members=formMembers();let r,writeStarted=false;
  saving=true;validate();showProgress();
  try{
    // The page already refreshes every 30 seconds. Reuse that live snapshot.
    if(!hasLiveSnapshot||Date.now()-lastLiveRead>30000){mergeRemote(await getRemote());}
    const found=duplicate(phone);
    if(found){endProgress();$('#trip-dialog').close();showDuplicate(found);return;}
    r={ticketId:'CK-'+crypto.randomUUID().slice(0,8).toUpperCase(),familyHead:members[0].name,phone,members,timestamp:new Date().toLocaleString('en-IN'),pending:true};
    records.push(r);persist();writeStarted=true;
    const result=await post(r);
    if(result.duplicate){
      records=records.filter(item=>item!==r);persist();
      let prior=result.data?normalize(result.data):null;
      if(!prior){mergeRemote(await getRemote());prior=duplicate(phone);}
      endProgress();$('#trip-dialog').close();showDuplicate(prior||r);return;
    }
    r.pending=false;if(result.ticketId)r.ticketId=String(result.ticketId);if(result.timestamp)r.timestamp=String(result.timestamp);
    // A background read might have finished while this write was in flight.
    records=records.filter(item=>item.phone!==phone);records.push(r);persist();renderList();switchTab(true);
    $('#sync-status').textContent='Live sync';$('#sync-status').classList.add('live');
    $('#members').replaceChildren();addMember(false);$('#phone').value='';showWelcome(r);play('celebrate');confetti();
  }catch{
    endProgress();$('#trip-dialog').close();play('error');
    if(writeStarted){notify('Saved on this device. Confirmation is pending; tap Refresh to check before retrying.');switchTab(true);$('#sync-status').textContent='Waiting to sync';}
    else notify('Google Sheets is not responding right now. Your form is unchanged. Please try again shortly.');
  }finally{saving=false;validate();}
});
addMember(false);renderList();sync(true);setInterval(()=>{if(!document.hidden)sync(false);},30000);window.addEventListener('online',()=>sync(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(false);});window.addEventListener('pageshow',event=>{if(event.persisted)sync(false);});window.addEventListener('storage',e=>{if(e.key===KEY){records=readCache();renderList();validate();}});
// Quiet, low-density ambient fireflies. Paused while hidden or reduced motion is preferred.
const canvas=$('#fireflies'),ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');let particles=[],last=0;
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;particles=Array.from({length:24},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.4+.3,v:Math.random()*.14+.04,p:Math.random()*6}));}resize();window.addEventListener('resize',resize);function draw(t){requestAnimationFrame(draw);if(motion.matches||document.hidden||t-last<45)return;last=t;ctx.clearRect(0,0,canvas.width,canvas.height);for(const p of particles){p.y-=p.v;p.x+=Math.sin(t/6000+p.p)*.14;if(p.y<0)p.y=canvas.height;ctx.beginPath();ctx.fillStyle=`rgba(95,222,171,${.12+.16*(1+Math.sin(t/2200+p.p))})`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}}requestAnimationFrame(draw);

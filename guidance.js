'use strict';
(() => {
  const form=document.getElementById('registration'),message=document.getElementById('guide-message');
  const cards=()=>[...document.querySelectorAll('.member-card')];
  const phone=document.getElementById('phone');
  function state(){
    for(const [i,card] of cards().entries()){
      if(!card.querySelector('.name-input').value.trim())return {stage:'members',kind:'name',target:card.querySelector('.name-input'),text:`അംഗം ${i+1}: പേര് നൽകുക.`,button:'പേര് നൽകാം · Enter name'};
      if(!card.querySelector('input[type=radio]:checked'))return {stage:'members',kind:'age',target:card.querySelector('input[type=radio]'),text:`അംഗം ${i+1}: ഇനി പ്രായപരിധി തിരഞ്ഞെടുക്കുക.`,button:'പ്രായപരിധി തിരഞ്ഞെടുക്കാം · Choose age'};
    }
    if(!form.querySelector('input[value=adult]:checked'))return {stage:'members',kind:'adult',target:document.getElementById('add-member'),text:'കുറഞ്ഞത് ഒരു മുതിർന്ന അംഗം വേണം. പ്രായപരിധി തിരുത്തുക അല്ലെങ്കിൽ മുതിർന്ന അംഗത്തെ ചേർക്കുക.',button:'അംഗത്തെ ചേർക്കാം · Add member'};
    if(!/^\d{10}$/.test(phone.value.replace(/\D/g,'')))return {stage:'phone',kind:'phone',target:phone,text:'അംഗങ്ങൾ തയ്യാറായി. ഇനി 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.',button:'മൊബൈൽ നമ്പർ നൽകാം · Enter phone'};
    return {stage:'submit',kind:'submit',target:document.getElementById('submit'),text:'എല്ലാം തയ്യാറായി! വിവരങ്ങൾ പരിശോധിച്ച് Register family അമർത്തുക.',button:'അവസാന ഘട്ടം · Review & submit'};
  }
  function update(){
    const next=state();message.textContent=next.text;document.getElementById('guide-next').textContent=next.button;
    const order=['members','phone','submit'];document.querySelectorAll('[data-guide-step]').forEach(li=>{const index=order.indexOf(li.dataset.guideStep),active=order.indexOf(next.stage);li.classList.toggle('is-current',index===active);li.classList.toggle('is-complete',index<active);if(index===active)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    cards().forEach(card=>{const named=!!card.querySelector('.name-input').value.trim(),aged=!!card.querySelector('input[type=radio]:checked');card.querySelector('.name-next').hidden=aged;card.querySelector('.name-next').disabled=!named;card.querySelector('.age-options').classList.toggle('needs-attention',named&&!aged);});
    document.getElementById('member-choices').hidden=next.stage==='members';
    document.getElementById('continue-submit').textContent=next.stage==='submit'?'Ready · Review & submit':'Next: review & submit';
  }
  function go(target){target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});target.focus({preventScroll:true});const surface=target.closest('.card')||target;surface.classList.remove('guided-focus');void surface.offsetWidth;surface.classList.add('guided-focus');}
  function advanceName(card){const input=card.querySelector('.name-input');if(!input.value.trim()){input.setAttribute('aria-invalid','true');go(input);return;}input.removeAttribute('aria-invalid');go(card.querySelector('input[type=radio]:checked')||card.querySelector('input[type=radio]'));update();}
  form.addEventListener('click',event=>{const next=event.target.closest('.name-next');if(next){advanceName(next.closest('.member-card'));return;}
    if(event.target.matches('input[type=radio]')&&event.detail>0){update();const current=state();if(current.stage!=='members')go(document.getElementById('continue-phone'));else if(current.kind==='name')go(current.target);else if(current.kind==='adult')go(document.getElementById('guide-next'));}
  });
  form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('.name-input')){event.preventDefault();advanceName(event.target.closest('.member-card'));}else if(event.key==='Enter'&&event.target===phone){event.preventDefault();go(state().target);}});
  form.addEventListener('input',()=>{update();});form.addEventListener('change',update);
  document.getElementById('guide-next').onclick=()=>go(state().target);
  document.getElementById('continue-phone').onclick=()=>{update();go(state().target);};
  document.getElementById('continue-submit').onclick=()=>{update();go(state().target);};
  new MutationObserver(update).observe(document.getElementById('members'),{childList:true});update();
})();

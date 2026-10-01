'use strict';
(() => {
  const dialog=document.getElementById('opening-notice');
  const agree=document.getElementById('notice-agree');
  let animation,accepted=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('notice-open');
  dialog.showModal();
  document.getElementById('notice-title').focus({preventScroll:true});
  dialog.addEventListener('cancel',event=>event.preventDefault());
  document.addEventListener('keydown',event=>{if(!accepted&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();}},true);
  dialog.addEventListener('close',()=>{if(!accepted)dialog.showModal();});
  agree.addEventListener('click',()=>{
    accepted=true;
    animation?.destroy();
    dialog.close();
    document.documentElement.classList.remove('notice-open');
    document.querySelector('#members .name-input')?.focus({preventScroll:true});
  });
  document.addEventListener('DOMContentLoaded',()=>{
    if(!dialog.open||reduced.matches||!window.lottie||!window.TRIP_PROGRESS_ANIMATION)return;
    const data=JSON.parse(JSON.stringify(window.TRIP_PROGRESS_ANIMATION));
    data.layers.forEach(layer=>layer.shapes.filter(shape=>shape.ty==='fl').forEach(shape=>shape.c.k=[1,.74,.23,1]));
    animation=window.lottie.loadAnimation({container:document.getElementById('notice-animation'),renderer:'svg',loop:true,autoplay:true,animationData:data});
  },{once:true});
})();

'use strict';
// Draw a dedicated print pass, not a screenshot of the interactive dialog.
window.createTicketPDF = async function createTicketPDF(registration) {
  if(!registration || registration.pending) throw new Error('Only confirmed tickets can be downloaded.');
  await Promise.all([document.fonts.load('600 32px "Noto Sans Malayalam"'),document.fonts.load('700 32px Inter')]);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const family=String(registration.familyHead||'Family'),ticket=String(registration.ticketId||'');
  const font=(size,weight=400)=>`${weight} ${size}px Inter, "Noto Sans Malayalam", sans-serif`;
  const wrap=(text,width,size,weight=400)=>{ctx.font=font(size,weight);const words=String(text).split(/\s+/),lines=[];let line='';for(const word of words){if(ctx.measureText(line?line+' '+word:word).width<=width){line=line?line+' '+word:word;continue;}if(line)lines.push(line);line='';const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ml',{granularity:'grapheme'}).segment(word)].map(x=>x.segment):Array.from(word);for(const char of segments){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}}if(line)lines.push(line);return lines;};
  const names=wrap(family,456,32,700),ids=wrap(ticket,290,21,600);
  const extra=(names.length-1)*46+(ids.length-1)*28,W=600,H=840+extra,scale=2.5;
  canvas.width=W*scale;canvas.height=H*scale;ctx.scale(scale,scale);
  const ink='#123c2b',muted='#5e7e6b',green='#157d4d';
  function text(str,x,y,size=16,weight=400,color=ink){ctx.font=font(size,weight);ctx.fillStyle=color;ctx.fillText(str,x,y);}
  function line(y,dashed=false){ctx.beginPath();ctx.strokeStyle='#bdd6c8';ctx.lineWidth=1;ctx.setLineDash(dashed?[5,5]:[]);ctx.moveTo(55,y);ctx.lineTo(W-55,y);ctx.stroke();ctx.setLineDash([]);}
  function label(str,x,y){text(str,x,y,10,600,muted);}
  ctx.fillStyle='#f9fcfa';ctx.fillRect(0,0,W,H);
  const gradient=ctx.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#eff9f2');gradient.addColorStop(.5,'#dcf2e7');gradient.addColorStop(1,'#f0f7f2');ctx.fillStyle=gradient;
  ctx.beginPath();ctx.roundRect(24,24,W-48,H-48,27);ctx.fill();ctx.strokeStyle='#bcd9c9';ctx.lineWidth=1;ctx.stroke();
  text('K·K',55,98,35,800);text('കാട്ടിലെ കുട്ടികൾ',145,79,20,700);text('COUSINS TRIP  /  2026',145,108,11,500,muted);
  label('FAMILY',465,79);label('EDITION',465,96);line(136);
  text('REGISTRATION CONFIRMED',55,184,11,700,green);
  ctx.fillStyle='#d1ebdc';ctx.beginPath();ctx.arc(516,190,22,0,Math.PI*2);ctx.fill();ctx.strokeStyle=green;ctx.lineWidth=2.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(506,190);ctx.lineTo(513,197);ctx.lineTo(526,182);ctx.stroke();
  text('Welcome to',55,236,36,700);text('the trip!',55,281,36,700);
  text('ഒരുമിച്ച് ഒരു യാത്ര. ഒരുപാട് ഓർമ്മകൾ.',55,324,16,400,muted);line(353);
  label('FAMILY / കുടുംബം',55,389);names.forEach((name,i)=>text(name,55,433+i*46,32,700));
  const y=478+(names.length-1)*46;
  const count=registration.members.length,adults=registration.members.filter(m=>m.type==='adult').length,kids=count-adults;
  label('TRAVELLERS',55,y);label('YOUR GROUP',312,y);
  text(String(count).padStart(2,'0'),55,y+41,33,700);text(count===1?'member':'members',108,y+39,13,400,muted);
  text(`${adults} ${adults===1?'adult':'adults'}  ·  ${kids} ${kids===1?'kid':'kids'}`,312,y+38,19,600);
  const perforation=y+76;
  ctx.fillStyle='#dcece2';ctx.fillRect(25,perforation,W-50,123+(ids.length-1)*28);
  ctx.beginPath();ctx.strokeStyle='#aacbb7';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.moveTo(25,perforation);ctx.lineTo(W-25,perforation);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#f9fcfa';for(const x of [24,W-24]){ctx.beginPath();ctx.arc(x,perforation,11,0,Math.PI*2);ctx.fill();}
  label('TICKET NUMBER',55,perforation+36);ids.forEach((id,i)=>text(id,55,perforation+69+i*28,21,600));
  ctx.strokeStyle='#a4cbb2';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(401,perforation+43,141,34,17);ctx.stroke();text('CONFIRMED',419,perforation+65,12,600,green);
  text('FAMILY TRIP PASS',55,H-105,12,700,green);text('Made for family. Made for memories.',55,H-78,13,400,muted);
  text('2026',456,H-80,30,700,'#adcbbb');
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[130,130*H/W],compress:true});
  pdf.setProperties({title:'Cousins Trip 2026 - '+ticket,subject:'Confirmed family trip pass',creator:'Cousins Trip 2026'});
  pdf.addImage(canvas.toDataURL('image/jpeg',.97),'JPEG',0,0,130,130*H/W,undefined,'FAST');
  return {pdf,canvas,filename:'Cousins-Trip-2026-'+ticket.replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)+'.pdf'};
};

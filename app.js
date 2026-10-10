'use strict';
const $ = s => document.querySelector(s), API = window.TRIP_CONFIG.apiUrl, KEY = 'cousins-trip-2026-v1';
const labels = { adult: 'Adult (12+)', kid8to15: 'Kid (6–12 Yrs)', kidBelow8: 'Kid (Below 6)' };
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalizePhone = p => { let d = String(p ?? '').replace(/\D/g, ''); return d.length === 12 && d.startsWith('91') ? d.slice(2) : d; };
function readCache() { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(r => r && Array.isArray(r.members)); } catch { return []; } }
let records = readCache(), memberId = 0, saving = false, syncing = false, soundEnabled = false, audioContext, duplicatePhone = '';
function persist() { try { localStorage.setItem(KEY, JSON.stringify(records)); return true; } catch { notify('Device storage is unavailable. Please keep this page open until your registration is synced.'); return false; } }
function normalize(r) { const types = { adult: 'adult', kid8to15: 'kid8to15', kidBelow8: 'kidBelow8', kid: 'kid8to15', child: 'kid8to15', child8to15: 'kid8to15', below8: 'kidBelow8', infant: 'kidBelow8', kid1: 'kid8to15', kid2: 'kidBelow8' }; let members = r.membersList || r.members || []; if (typeof members === 'string') { try { members = JSON.parse(members); } catch { members = []; } } if (!Array.isArray(members)) members = []; return { ticketId: String(r.ticketId || r.id || ''), phone: normalizePhone(r.phone), familyHead: String(r.familyHead || members[0]?.name || ''), members: members.map(m => ({ name: String(m.name || ''), type: types[m.type || m.category] || 'kid8to15' })), timestamp: r.timestamp || r.createdAt || '', pending: false, isTest: r.isTest === true }; }
function isValidRecord(r) { return String(r.phone || '').replace(/\D/g, '').length >= 7 && r.members.length > 0 && !r.isTest; }
function play(kind = 'click') { if (!soundEnabled) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume(); const notes = kind === 'celebrate' ? [523, 659, 784, 1047] : kind === 'add' ? [660, 880] : kind === 'error' ? [180, 130] : [520]; notes.forEach((f, i) => { const o = audioContext.createOscillator(), g = audioContext.createGain(), t = audioContext.currentTime + i * .11; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.055, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g); g.connect(audioContext.destination); o.start(t); o.stop(t + .25); }); } catch { } }
$('#sound').onclick = () => { soundEnabled = !soundEnabled; $('#sound').setAttribute('aria-pressed', String(soundEnabled)); $('#sound span').textContent = soundEnabled ? 'Sound on' : 'Sound muted'; play(); };
const TABS = ['register', 'joined', 'budget'];
function switchTab(tab, focus = false) {
  if (typeof tab === 'boolean') tab = tab ? 'joined' : 'register';
  const activeIdx = Math.max(0, TABS.indexOf(tab));
  const activeName = TABS[activeIdx];
  $('.tabs').setAttribute('data-tab', String(activeIdx));
  $('.tabs').classList.toggle('joined', activeName === 'joined');
  TABS.forEach(name => {
    const on = name === activeName;
    const btn = $(`#${name}-tab`), panel = $(`#${name}-panel`);
    if (btn) { btn.setAttribute('aria-selected', String(on)); btn.tabIndex = on ? 0 : -1; }
    if (panel) panel.hidden = !on;
  });
  if (activeName === 'joined') { renderList(); sync(false); }
  if (activeName === 'budget') { renderBudget(); sync(false); }
  if (focus && $(`#${activeName}-tab`)) $(`#${activeName}-tab`).focus();
  play();
}
$('#register-tab').onclick = () => switchTab('register');
$('#joined-tab').onclick = () => switchTab('joined');
$('#budget-tab').onclick = () => switchTab('budget');
$('.tabs').onkeydown = e => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const cur = Number($('.tabs').getAttribute('data-tab') || 0);
    let next = cur;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else if (e.key === 'ArrowRight') next = (cur + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + TABS.length) % TABS.length;
    switchTab(TABS[next], true);
  }
};
function addMember(focus = true) { const id = ++memberId, first = !$('#members').children.length; const card = document.createElement('article'); card.className = 'card member-card'; card.dataset.id = id; card.innerHTML = `<div class="card-header"><span class="number"></span><div class="card-title">അംഗം<small>Member</small></div>${first ? '' : `<button class="remove" type="button" aria-label="Remove member">×</button>`}</div><label class="field-label" for="name-${id}">FULL NAME / പേര്</label><input id="name-${id}" class="name-input" autocomplete="${first ? 'name' : 'off'}" placeholder="Enter member’s name" maxlength="80" required><button type="button" class="field-next name-next">Next: choose age group</button><fieldset class="age-options"><legend class="field-label">AGE GROUP / പ്രായപരിധി</legend>${[['adult', 'മുതിർന്നവർ', 'Adult · 12+'], ['kid8to15', 'കുട്ടി', '6–12 വയസ്സ്'], ['kidBelow8', 'കുട്ടി', '6 വയസ്സിൽ താഴെ · Below 6']].map(([value, ml, en]) => `<label class="age-option"><input type="radio" name="age-${id}" value="${value}" required><span>${ml}<small>${en}</small></span></label>`).join('')}</fieldset>`; $('#members').append(card); card.querySelector('.remove')?.addEventListener('click', () => { card.remove(); renumber(); validate(); play(); $('#add-member').focus(); }); renumber(); validate(); if (focus) { card.querySelector('input').focus(); play('add'); } }
function renumber() { document.querySelectorAll('.member-card').forEach((c, i) => { c.querySelector('.number').textContent = String(i + 1).padStart(2, '0'); }); }
$('#add-member').onclick = () => addMember();
function formMembers() { return [...document.querySelectorAll('.member-card')].map(c => ({ name: c.querySelector('.name-input').value.trim(), type: c.querySelector('input[type=radio]:checked')?.value || '' })); }
function duplicate(phone) { return records.find(r => r.phone === phone); }
function validate() { const members = formMembers(), phone = normalizePhone($('#phone').value); let message = '✅ സമർപ്പിക്കാൻ തയ്യാറാണ്!'; if (members.some(m => !m.name)) message = 'ഓരോ അംഗത്തിന്റെയും പേര് നൽകുക'; else if (members.some(m => !m.type)) message = 'എല്ലാ അംഗങ്ങളുടെയും പ്രായപരിധി തിരഞ്ഞെടുക്കുക'; else if (!members.some(m => m.type === 'adult')) message = 'ഒരു മുതിർന്ന അംഗത്തെയെങ്കിലും ചേർക്കുക'; else if (!/^\d{10}$/.test(phone)) message = 'തുടരാൻ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക'; const valid = message.startsWith('✅'); $('#form-status').textContent = saving ? 'Saving your family…' : message; $('#form-status').classList.toggle('ready', valid && !saving); $('#submit').disabled = !valid || saving; const exists = phone.length === 10 && duplicate(phone); $('#phone-warning').hidden = !exists; $('#phone-warning').textContent = exists ? 'ഈ നമ്പറിൽ രജിസ്ട്രേഷൻ നിലവിലുണ്ട് · Already registered' : ''; return valid; }
$('#registration').addEventListener('input', validate); $('#registration').addEventListener('change', () => { validate(); play(); }); $('#phone').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d\s]/g, ''); });
function showDuplicate(r) { duplicatePhone = r.phone; $('#duplicate-summary').innerHTML = `<strong>${escapeHtml(r.familyHead)}</strong><br>Ticket: ${escapeHtml(r.ticketId)}<br>Total members: ${r.members.length}`; $('#duplicate-dialog').showModal(); play('error'); }
$('#edit-phone').onclick = () => { $('#duplicate-dialog').close(); $('#phone').focus(); }; $('#view-duplicate').onclick = () => { $('#duplicate-dialog').close(); $('#search').value = duplicatePhone; switchTab(true); $('#search').focus(); };
function renderList() { const all = records.filter(isValidRecord), members = all.flatMap(r => r.members), adults = members.filter(m => !isPayingKid(m.name) && m.type !== 'kidBelow8').length; $('#count').textContent = members.length; $('#stats').innerHTML = [['Families', all.length], ['Total', members.length], ['Adults', adults], ['Kids', members.length - adults]].map(([k, v]) => `<div class="metric"><strong>${v}</strong><span>${k}</span></div>`).join(''); const query = $('#search').value.toLowerCase().trim(), shown = all.filter(r => [r.familyHead, r.phone, r.ticketId, ...r.members.map(m => m.name)].join(' ').toLowerCase().includes(query)); $('#joined-list').innerHTML = shown.length ? shown.slice().reverse().map(r => `<article class="card family-card"><div class="pass-body"><div class="pass-heading"><span>K·K <b>COUSINS TRIP</b></span><span>2026</span></div><div class="family-top"><span class="avatar">${escapeHtml(Array.from(r.familyHead)[0]?.toUpperCase() || 'F')}</span><div><h3>${r.members.length === 1 ? escapeHtml(r.members[0].name) : 'FAMILY'}</h3><p>+91 ${escapeHtml(r.phone)}</p></div><span class="pass-count"><strong>${String(r.members.length).padStart(2, '0')}</strong> ${r.members.length === 1 ? 'traveller' : 'travellers'}</span></div><div class="pass-label">TRAVELLERS / അംഗങ്ങൾ</div><div class="chips">${r.members.map(m => { const isKid = isPayingKid(m.name); const isYoung = m.type === 'kidBelow8'; const tagClass = isKid ? 'kid' : isYoung ? 'young' : ''; const badge = isKid ? ' · കുട്ടി' : isYoung ? ' · കുട്ടി (<6)' : ''; return `<span class="chip ${tagClass}"><b>${escapeHtml(m.name)}</b>${badge ? `<span>${badge}</span>` : ''}</span>`; }).join('')}</div></div><div class="family-bottom"><div><span class="pass-label">FAMILY TRIP PASS</span><strong class="pass-number">${escapeHtml(r.ticketId)}</strong></div><span class="pass-status ${r.pending ? 'pending' : ''}">${r.pending ? '◷ Waiting to sync' : '✓ Confirmed'}</span></div></article>`).join('') : `<div class="card empty"><div class="empty-symbol">♧</div><h3>${query ? 'No matching families' : 'The first memory starts here.'}</h3><p>${query ? 'Try another name, phone number or ticket ID.' : 'Be the first to bring your people along.'}</p><button class="primary" id="empty-action">${query ? 'Clear search' : 'രജിസ്റ്റർ ചെയ്യുക · Register now'}</button></div>`; $('#empty-action')?.addEventListener('click', () => { if (query) { $('#search').value = ''; renderList(); } else switchTab(false, true); }); }
$('#search').addEventListener('input', renderList);
const network = window.createTripNetwork(API);
let hasLiveSnapshot = false, lastLiveRead = 0;
async function getRemote() { return (await network.read()).map(normalize).filter(isValidRecord); }
function mergeRemote(remote) { hasLiveSnapshot = true; lastLiveRead = Date.now(); const pending = records.filter(r => r.pending && !remote.some(s => s.phone === r.phone)); records = [...remote, ...pending]; persist(); renderList(); renderBudget(); validate(); }
function payload(r) { const adultCount = r.members.filter(m => m.type === 'adult').length, kid8to15Count = r.members.filter(m => m.type === 'kid8to15').length, kidBelow8Count = r.members.filter(m => m.type === 'kidBelow8').length; return { ...r, totalCount: r.members.length, adultCount, kid8to15Count, kidBelow8Count, membersList: r.members, membersSummary: r.members.map((m, i) => `${i + 1}. ${m.name} (${labels[m.type]})`).join('\n') }; }
async function post(r) { const result = await network.write(payload(r)); if (result.status === 'duplicate' || result.code === 'DUPLICATE') return { duplicate: true, data: result.data }; if (result.status !== 'success' && result.success !== true) throw Error(result.message || 'Registration sync could not be confirmed'); return result; }
async function sync(retry = false) { if (syncing || saving) return; syncing = true; $('#refresh').disabled = true; $('#sync-status').textContent = 'Refreshing…'; $('#sync-status').classList.remove('live'); if (!hasLiveSnapshot && !records.length) { $('#joined-list').innerHTML = '<div class="card empty" role="status">Loading families from Google Sheets…</div>'; } try { mergeRemote(await getRemote()); if (retry && records.some(r => r.pending)) { for (const r of records.filter(r => r.pending)) { await post(r); } mergeRemote(await getRemote()); } const pending = records.some(r => r.pending); $('#sync-status').textContent = pending ? 'Waiting to sync' : 'Live sync'; $('#sync-status').classList.toggle('live', !pending); $('#list-message').textContent = 'Updated from Google Sheets · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { $('#sync-status').textContent = 'Could not refresh · cached data'; $('#list-message').textContent = 'Could not refresh the family list. Your saved entries are still here. Tap Refresh to try again.'; if (!hasLiveSnapshot && !records.length) { $('#joined-list').innerHTML = '<div class="card empty">The family list could not be loaded. Tap Refresh to try again.</div>'; } } finally { syncing = false; $('#refresh').disabled = false; } }
$('#refresh').onclick = () => sync(true);

function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => $('#toast').hidden = true, 7000); }
function confetti() { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; for (let i = 0; i < 64; i++) { const c = document.createElement('i'); c.className = 'confetti'; const left = i % 2 === 0; c.style.left = left ? '0' : '100%'; c.style.top = '65%'; c.style.background = ['#62edb1', '#0bbad4', '#e7c372', '#edf9ef'][i % 4]; c.style.setProperty('--dx', `${(left ? 1 : -1) * (80 + Math.random() * innerWidth * .55)}px`); c.style.setProperty('--dy', `${-400 + Math.random() * 650}px`); document.body.append(c); setTimeout(() => c.remove(), 2000); } }
let tripAnimation, progressTimer, confirmedTicket, ticketExportPromise, ticketImageFile;
function showProgress() {
  const dialog = $('#trip-dialog'); dialog.classList.remove('is-ticket'); $('#ticket-brand').hidden = true;
  $('#trip-close').hidden = true; $('#trip-actions').hidden = true; $('#trip-details').hidden = true; $('#trip-success').hidden = true; $('#trip-progress').hidden = false; $('#trip-wait-note').hidden = false;
  $('#trip-kicker').textContent = 'A NEW MEMORY BEGINS'; $('#trip-dialog-title').textContent = 'Saving your spot…'; $('#trip-dialog-description').textContent = 'നിങ്ങളുടെ രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുന്നു.';
  dialog.setAttribute('aria-busy', 'true'); dialog.showModal(); $('#trip-dialog-title').focus();
  if (window.lottie && !tripAnimation) { try { tripAnimation = window.lottie.loadAnimation({ container: $('#trip-lottie'), renderer: 'svg', loop: true, autoplay: false, animationData: window.TRIP_PROGRESS_ANIMATION }); } catch { } }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tripAnimation?.play();
  progressTimer = setTimeout(() => { $('#trip-dialog-description').textContent = 'Google Sheets is taking a little longer. We’re still saving your family…'; }, 8000);
}
function endProgress() { clearTimeout(progressTimer); tripAnimation?.pause(); $('#trip-dialog').removeAttribute('aria-busy'); }
function showWelcome(r) {
  endProgress(); $('#trip-dialog').classList.add('is-ticket'); $('#ticket-brand').hidden = false; $('#trip-progress').hidden = true; $('#trip-success').hidden = false; $('#trip-kicker').textContent = 'REGISTRATION CONFIRMED';
  $('#trip-dialog-title').textContent = 'Welcome to the trip!'; $('#trip-dialog-description').textContent = 'ഒരുമിച്ച് ഒരു യാത്ര. ഒരുപാട് ഓർമ്മകൾ.';
  const adults = r.members.filter(m => m.type === 'adult').length;
  $('#trip-details').innerHTML = `<div class="ticket-holder"><span class="ticket-label">FAMILY / കുടുംബം</span><strong>${escapeHtml(r.familyHead)}</strong></div><div class="ticket-grid"><div><span class="ticket-label">TRAVELLERS</span><strong>${String(r.members.length).padStart(2, '0')} <small>members</small></strong></div><div><span class="ticket-label">YOUR GROUP</span><strong>${adults} <small>adults</small> · ${r.members.length - adults} <small>kids</small></strong></div></div><div class="ticket-members"><span class="ticket-label">MEMBERS / അംഗങ്ങൾ</span><div class="ticket-member-chips">${r.members.map(member => `<span class="ticket-member-chip">${escapeHtml(member.name)}</span>`).join('')}</div></div><div class="ticket-stub"><div><span class="ticket-label">TICKET NUMBER</span><strong>${escapeHtml(r.ticketId)}</strong></div><span class="ticket-confirmed">✓ Confirmed</span></div>`; $('#trip-details').hidden = false;
  confirmedTicket = JSON.parse(JSON.stringify(r)); prepareTicketImage(); $('#trip-actions').hidden = false; $('#trip-close').hidden = false; $('#trip-wait-note').hidden = true; $('#trip-dialog-title').focus();
}
function prepareTicketImage() {
  ticketImageFile = null;
  const button = $('#trip-share-image'); button.disabled = true; button.querySelector('span').textContent = 'Preparing ticket image…'; $('#ticket-share-status').textContent = '';
  const snapshot = confirmedTicket;
  ticketExportPromise = window.createTicketPDF(snapshot);
  ticketExportPromise.then(async result => {
    const blob = await new Promise((resolve, reject) => result.canvas.toBlob(value => value ? resolve(value) : reject(Error('Image export failed')), 'image/png'));
    if (confirmedTicket !== snapshot) return;
    ticketImageFile = new File([blob], result.filename.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
    button.disabled = false; button.querySelector('span').textContent = 'Share ticket image';
    $('#ticket-share-status').textContent = navigator.canShare?.({ files: [ticketImageFile] }) ? 'Choose WhatsApp in your phone’s share menu.' : 'Your browser can save the image to attach in WhatsApp.';
  }).catch(() => { if (confirmedTicket !== snapshot) return; ticketExportPromise = null; button.disabled = false; button.querySelector('span').textContent = 'Retry ticket image'; $('#ticket-share-status').textContent = 'Image preparation failed. Tap to retry.'; });
}
function saveTicketImage() {
  const url = URL.createObjectURL(ticketImageFile), link = document.createElement('a'); link.href = url; link.download = ticketImageFile.name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  $('#ticket-share-status').textContent = 'Ticket PNG saved. Open WhatsApp and attach it from Photos or Files.';
}
$('#trip-share-image').onclick = async () => {
  if (!ticketImageFile) { if (confirmedTicket) prepareTicketImage(); return; }
  // The file is prepared before the tap, preserving the browser's share permission.
  if (navigator.share && navigator.canShare?.({ files: [ticketImageFile] })) {
    try { await navigator.share({ files: [ticketImageFile], title: 'Cousins Trip 2026 ticket' }); $('#ticket-share-status').textContent = ''; }
    catch (error) { if (error.name !== 'AbortError') { $('#ticket-share-status').textContent = 'Image sharing is unavailable. Saving the ticket so you can attach it in WhatsApp.'; saveTicketImage(); } }
  } else saveTicketImage();
};
$('#trip-download').onclick = async () => {
  if (!confirmedTicket) return;
  const button = $('#trip-download'), label = button.querySelector('span'); button.disabled = true; label.textContent = 'Preparing your PDF…';
  try { const result = await (ticketExportPromise || window.createTicketPDF(confirmedTicket)); await result.pdf.save(result.filename, { returnPromise: true }); }
  catch { notify('Could not download the PDF. Please try again.'); }
  finally { button.disabled = false; label.innerHTML = 'Download Ticket<small>Save your trip pass as PDF</small>'; }
};
$('#trip-dialog').addEventListener('cancel', e => { if (saving) e.preventDefault(); });
$('#trip-dialog').addEventListener('close', endProgress);
$('#trip-close').onclick = $('#trip-done').onclick = () => { $('#trip-dialog').close(); switchTab(true, true); };
$('#registration').addEventListener('submit', async e => {
  e.preventDefault(); if (saving || !validate()) return;
  const phone = normalizePhone($('#phone').value), existing = duplicate(phone);
  if (existing) { showDuplicate(existing); return; }
  const members = formMembers(); let r, writeStarted = false;
  saving = true; validate(); showProgress();
  try {
    // The page already refreshes every 30 seconds. Reuse that live snapshot.
    if (!hasLiveSnapshot || Date.now() - lastLiveRead > 30000) { mergeRemote(await getRemote()); }
    const found = duplicate(phone);
    if (found) { endProgress(); $('#trip-dialog').close(); showDuplicate(found); return; }
    r = { ticketId: 'CK-' + crypto.randomUUID().slice(0, 8).toUpperCase(), familyHead: members[0].name, phone, members, timestamp: new Date().toLocaleString('en-IN'), pending: true };
    records.push(r); persist(); writeStarted = true;
    const result = await post(r);
    if (result.duplicate) {
      records = records.filter(item => item !== r); persist();
      let prior = result.data ? normalize(result.data) : null;
      if (!prior) { mergeRemote(await getRemote()); prior = duplicate(phone); }
      endProgress(); $('#trip-dialog').close(); showDuplicate(prior || r); return;
    }
    r.pending = false; if (result.ticketId) r.ticketId = String(result.ticketId); if (result.timestamp) r.timestamp = String(result.timestamp);
    // A background read might have finished while this write was in flight.
    records = records.filter(item => item.phone !== phone); records.push(r); persist(); renderList(); switchTab(true);
    $('#sync-status').textContent = 'Live sync'; $('#sync-status').classList.add('live');
    $('#members').replaceChildren(); addMember(false); $('#phone').value = ''; showWelcome(r); play('celebrate'); confetti();
  } catch {
    endProgress(); $('#trip-dialog').close(); play('error');
    if (writeStarted) { notify('Saved on this device. Confirmation is pending; tap Refresh to check before retrying.'); switchTab(true); $('#sync-status').textContent = 'Waiting to sync'; }
    else notify('Google Sheets is not responding right now. Your form is unchanged. Please try again shortly.');
  } finally { saving = false; validate(); }
});
/* ==================== BUDGET ENGINE ==================== */
const BUDGET_KEY = 'cousins-trip-2026-budget-v4';
const PAID_KEY = 'cousins-trip-2026-paid-v4';

function isPayingKid(name) {
  const n = String(name || '').toLowerCase().trim();
  return n.includes('amna') || n.includes('faizan');
}

function readBudgetConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');
    return Object.assign({
      rateAdult: 1200,      // Adult (above 12): ₹1,200 each
      rateKid: 500,         // Kids (6 to 12): ₹500 each
      travel: '',           // Total Travel expense
      dinner: '',           // Total Dinner expense
      other: ''             // Other expenses
    }, saved);
  } catch {
    return {
      rateAdult: 1200,
      rateKid: 500,
      travel: '',
      dinner: '',
      other: ''
    };
  }
}

let budgetConfig = readBudgetConfig();
function persistBudget() {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetConfig)); } catch { }
}
function readPaidMap() {
  try { return JSON.parse(localStorage.getItem(PAID_KEY) || '{}'); } catch { return {}; }
}
function togglePaid(phone) {
  const map = readPaidMap();
  map[phone] = !map[phone];
  try { localStorage.setItem(PAID_KEY, JSON.stringify(map)); } catch { }
  renderBudget();
  play('click');
}

function computeBudget(cfg, allRecords) {
  const valid = (allRecords || []).filter(isValidRecord);
  let totalAdults = 0, totalKids = 0, totalKidsBelow8 = 0;
  valid.forEach(r => {
    (r.members || []).forEach(m => {
      if (isPayingKid(m.name)) totalKids++;
      else if (m.type === 'kidBelow8') totalKidsBelow8++;
      else totalAdults++;
    });
  });
  const totalHeadcount = totalAdults + totalKids + totalKidsBelow8;

  const kidRate = (cfg.rateKid !== undefined && cfg.rateKid !== '') ? Math.max(0, Number(cfg.rateKid)) : 500;
  const kidBelow8Rate = 0; // Free
  const totalKidResort = totalKids * kidRate;

  let adultResortRate = 1200;
  let totalResort = 0;

  if (cfg.resort && Number(cfg.resort) > 5000) {
    // If a lump sum resort total was specified (e.g. 30,000)
    totalResort = Math.max(0, Number(cfg.resort));
    const remainingResortForAdults = Math.max(0, totalResort - totalKidResort);
    adultResortRate = totalAdults > 0 ? Math.round(remainingResortForAdults / totalAdults) : 0;
  } else {
    // Per head adult rate specified (default 1,200)
    const rawRate = (cfg.rateAdult !== undefined && cfg.rateAdult !== '') ? cfg.rateAdult : (cfg.resort || 1200);
    adultResortRate = Math.max(0, Number(rawRate) || 1200);
    totalResort = (totalAdults * adultResortRate) + totalKidResort;
  }

  const travelTotal = Math.max(0, Number(cfg.travel) || 0);
  const dinnerTotal = Math.max(0, Number(cfg.dinner) || 0);
  const otherTotal = Math.max(0, Number(cfg.other) || 0);

  const payingUnits = totalAdults + (totalKids * 0.5);
  const travelPerAdult = payingUnits > 0 ? Math.round(travelTotal / payingUnits) : 0;
  const travelPerKid = Math.round(travelPerAdult * 0.5);

  const dinnerPerAdult = payingUnits > 0 ? Math.round(dinnerTotal / payingUnits) : 0;
  const dinnerPerKid = Math.round(dinnerPerAdult * 0.5);

  const otherPerAdult = payingUnits > 0 ? Math.round(otherTotal / payingUnits) : 0;
  const otherPerKid = Math.round(otherPerAdult * 0.5);

  const totalExpense = totalResort + travelTotal + dinnerTotal + otherTotal;

  const adultRate = adultResortRate + travelPerAdult + dinnerPerAdult + otherPerAdult;
  const finalKidRate = kidRate + travelPerKid + dinnerPerKid + otherPerKid;

  const paidMap = readPaidMap();

  const familySplits = valid.map(r => {
    let adults = 0, payingKids = 0, below6 = 0;
    const annotatedMembers = (r.members || []).map(m => {
      if (isPayingKid(m.name)) {
        payingKids++;
        return {
          name: m.name,
          category: 'kid',
          amountText: `₹${finalKidRate.toLocaleString('en-IN')}`,
          typeText: 'KID',
          badge: `കുട്ടി · ₹${finalKidRate.toLocaleString('en-IN')}`
        };
      } else if (m.type === 'kidBelow8') {
        below6++;
        return {
          name: m.name,
          category: 'young',
          amountText: 'Free',
          typeText: 'KID (<6)',
          badge: 'കുട്ടി (<6 · Free)'
        };
      } else {
        adults++;
        return {
          name: m.name,
          category: 'adult',
          amountText: `₹${adultRate.toLocaleString('en-IN')}`,
          typeText: 'ADULT',
          badge: ''
        };
      }
    });

    const resortShare = (adults * adultResortRate) + (payingKids * kidRate);
    const travelShare = (adults * travelPerAdult) + (payingKids * travelPerKid);
    const dinnerShare = (adults * dinnerPerAdult) + (payingKids * dinnerPerKid);
    const otherShare = (adults * otherPerAdult) + (payingKids * otherPerKid);

    const totalDue = resortShare + travelShare + dinnerShare + otherShare;

    return {
      record: r,
      phone: r.phone,
      familyHead: r.familyHead || 'Family',
      ticketId: r.ticketId,
      totalCount: (r.members || []).length,
      members: annotatedMembers,
      adults, payingKids, below6,
      adultRate, kidRate: finalKidRate, kidBelow8Rate: 0,
      resortShare, travelShare, dinnerShare, otherShare,
      totalDue,
      isPaid: !!paidMap[r.phone]
    };
  });

  return {
    cfg,
    resort: totalResort,
    adultResortRate,
    travel: travelTotal,
    travelPerAdult, travelPerKid,
    dinner: dinnerTotal,
    dinnerPerAdult, dinnerPerKid,
    other: otherTotal,
    totalExpense,
    totalFamilies: valid.length,
    totalHeadcount, totalAdults, totalKids, totalKidsBelow8,
    adultRate, kidRate: finalKidRate, kidBelow8Rate: 0,
    familySplits
  };
}

function makeFamilyWhatsAppUrl(f, b) {
  const membersLines = f.members.map(m => `• *${m.name}* : ${m.amountText}  ${m.typeText}`).join('\n');

  const text = `🌿 *കാട്ടിലെ കുട്ടികൾ · Cousins Trip 2026*
📋 *യാത്രാ ചെലവ് വിഹിതം (Trip Budget Share)*

കുടുംബം: *${f.familyHead}*

👥 *അംഗങ്ങൾ & നിരക്ക്:*
${membersLines}
${(b.travel > 0 || b.dinner > 0) ? `\n🏕️ *ചെലവ് വിവരങ്ങൾ:*\n- Resort: ₹${f.resortShare.toLocaleString('en-IN')}${f.travelShare ? `\n- Travel: ₹${f.travelShare.toLocaleString('en-IN')}` : ''}${f.dinnerShare ? `\n- Dinner: ₹${f.dinnerShare.toLocaleString('en-IN')}` : ''}\n` : ''}
💰 *ആകെ അടയ്ക്കേണ്ട തുക: ₹${f.totalDue.toLocaleString('en-IN')}*

ഒരുമിച്ച് ഒരു യാത്ര. ഒരുപാട് ഓർമ്മകൾ! ❤️`;
  return `https://wa.me/91${f.phone}?text=${encodeURIComponent(text)}`;
}

function makeGroupSummaryText(b) {
  return `🌿 *കാട്ടിലെ കുട്ടികൾ · Cousins Trip 2026*
📊 *യാത്രാ ബഡ്ജറ്റ് & ചെലവ് വിഹിതം (Trip Budget Breakdown)*

🏕️ *ആകെ ചെലവുകൾ (Expenses):*
• Resort / താമസം: ₹${b.resort.toLocaleString('en-IN')}${b.travel ? `\n• Travel / യാത്ര: ₹${b.travel.toLocaleString('en-IN')}` : ''}${b.dinner ? `\n• Dinner / ഭക്ഷണം: ₹${b.dinner.toLocaleString('en-IN')}` : ''}${b.other ? `\n• മറ്റ് ചെലവുകൾ: ₹${b.other.toLocaleString('en-IN')}` : ''}
━━━━━━━━━━━━━━━━
💰 *ആകെ ബഡ്ജറ്റ്: ₹${b.totalExpense.toLocaleString('en-IN')}*

👥 *പങ്കെടുക്കുന്നവർ (${b.totalHeadcount} പേർ · ${b.totalFamilies} കുടുംബങ്ങൾ):*
• മുതിർന്നവർ (12+): ${b.totalAdults} പേർ
• കുട്ടികൾ (Amna & Faizan): ${b.totalKids} പേർ
• കുട്ടികൾ (<6 വയസ്സ്): ${b.totalKidsBelow8} പേർ

💵 *ഒരാൾക്കുള്ള നിരക്ക് (Per Head Rate):*
• മുതിർന്നവർ (12+): ₹${b.adultRate.toLocaleString('en-IN')}
• കുട്ടികൾ (Amna & Faizan): ₹${b.kidRate.toLocaleString('en-IN')}
• കുട്ടികൾ (<6 Yrs): Free (₹0)

ഒരുമിച്ച് ഒരു യാത്ര. ഒരുപാട് ഓർമ്മകൾ! ❤️`;
}

let budgetSearchQuery = '';
function renderBudget() {
  const b = computeBudget(budgetConfig, records);
  const activeEl = document.activeElement;
  const isFocused = id => activeEl && activeEl.id === id;

  // Admin inputs update
  if (!isFocused('budget-resort') && $('#budget-resort')) $('#budget-resort').value = budgetConfig.rateAdult ?? budgetConfig.resort ?? 1200;
  if (!isFocused('rate-kid-manual') && $('#rate-kid-manual')) $('#rate-kid-manual').value = budgetConfig.rateKid ?? 500;
  if (!isFocused('budget-travel') && $('#budget-travel')) $('#budget-travel').value = budgetConfig.travel || '';
  if (!isFocused('budget-dinner') && $('#budget-dinner')) $('#budget-dinner').value = budgetConfig.dinner || '';
  if (!isFocused('budget-other') && $('#budget-other')) $('#budget-other').value = budgetConfig.other || '';

  // Update Trip Budget Overview Card
  if ($('#display-total-budget')) $('#display-total-budget').textContent = '₹' + b.totalExpense.toLocaleString('en-IN');
  if ($('#display-resort')) $('#display-resort').textContent = '₹' + b.resort.toLocaleString('en-IN');
  if ($('#display-travel')) {
    if (b.travel > 0) {
      $('#display-travel').textContent = '₹' + b.travel.toLocaleString('en-IN');
    } else {
      $('#display-travel').innerHTML = '<span class="cat-pill-soon">Coming soon</span>';
    }
  }
  if ($('#display-dinner')) {
    if (b.dinner > 0) {
      $('#display-dinner').textContent = '₹' + b.dinner.toLocaleString('en-IN');
    } else {
      $('#display-dinner').innerHTML = '<span class="cat-pill-soon">Coming soon</span>';
    }
  }

  // Handle travel upcoming vs configured panel
  const travelUpcoming = $('#travel-upcoming-box'), travelConfigured = $('#travel-configured-box');
  if (travelUpcoming && travelConfigured) {
    if (b.travel > 0) {
      travelUpcoming.hidden = true;
      travelConfigured.hidden = false;
      travelConfigured.innerHTML = `
        <div class="rates-banner">
          <div class="rate-box">
            <span class="rate-label">മുതിർന്നവർ (Adult 12+)</span>
            <strong class="rate-val">₹${b.travelPerAdult.toLocaleString('en-IN')}</strong>
            <small>${b.totalAdults} members</small>
          </div>
          <div class="rate-box">
            <span class="rate-label">കുട്ടികൾ (Amna &amp; Faizan)</span>
            <strong class="rate-val">₹${b.travelPerKid.toLocaleString('en-IN')}</strong>
            <small>${b.totalKids} kids</small>
          </div>
          <div class="rate-box">
            <span class="rate-label">കുട്ടികൾ (&lt;6 Yrs)</span>
            <strong class="rate-val">Free</strong>
            <small>${b.totalKidsBelow8} kids</small>
          </div>
        </div>
      `;
    } else {
      travelUpcoming.hidden = false;
      travelConfigured.hidden = true;
    }
  }

  // Handle food upcoming vs configured panel
  const foodUpcoming = $('#food-upcoming-box'), foodConfigured = $('#food-configured-box');
  if (foodUpcoming && foodConfigured) {
    if (b.dinner > 0) {
      foodUpcoming.hidden = true;
      foodConfigured.hidden = false;
      foodConfigured.innerHTML = `
        <div class="rates-banner">
          <div class="rate-box">
            <span class="rate-label">മുതിർന്നവർ (Adult 12+)</span>
            <strong class="rate-val">₹${b.dinnerPerAdult.toLocaleString('en-IN')}</strong>
            <small>${b.totalAdults} members</small>
          </div>
          <div class="rate-box">
            <span class="rate-label">കുട്ടികൾ (Amna &amp; Faizan)</span>
            <strong class="rate-val">₹${b.dinnerPerKid.toLocaleString('en-IN')}</strong>
            <small>${b.totalKids} kids</small>
          </div>
          <div class="rate-box">
            <span class="rate-label">കുട്ടികൾ (&lt;6 Yrs)</span>
            <strong class="rate-val">Free</strong>
            <small>${b.totalKidsBelow8} kids</small>
          </div>
        </div>
      `;
    } else {
      foodUpcoming.hidden = false;
      foodConfigured.hidden = true;
    }
  }

  // Rate displays in Resort overview
  if ($('#display-rate-adult')) $('#display-rate-adult').textContent = '₹' + b.adultResortRate.toLocaleString('en-IN');
  if ($('#display-count-adult')) $('#display-count-adult').textContent = b.totalAdults + ' members';
  if ($('#display-rate-kid')) $('#display-rate-kid').textContent = '₹' + (budgetConfig.rateKid ?? 500).toLocaleString('en-IN');
  if ($('#display-count-kid')) $('#display-count-kid').textContent = b.totalKids + ' kids (Amna & Faizan)';
  if ($('#display-rate-kid-below8')) $('#display-rate-kid-below8').textContent = 'Free';
  if ($('#display-count-kid-below8')) $('#display-count-kid-below8').textContent = b.totalKidsBelow8 + ' kids (<6)';

  // Render Family List
  const q = budgetSearchQuery.toLowerCase().trim();
  const listEl = $('#budget-family-list');
  if (!listEl) return;

  const filtered = b.familySplits.filter(f => {
    return [f.familyHead, f.phone, f.ticketId, ...f.record.members.map(m => m.name)].join(' ').toLowerCase().includes(q);
  });

  if (!filtered.length) {
    if (syncing && !records.length) {
      listEl.innerHTML = `
        <div class="card empty">
          <div class="empty-symbol">⏳</div>
          <h3>ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു…</h3>
          <p>Fetching registered families from Google Sheets.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = `
        <div class="card empty">
          <div class="empty-symbol">🪙</div>
          <h3>${q ? 'No matching families' : 'കുടുംബങ്ങൾ ഇതുവരെ ചേർത്തിട്ടില്ല'}</h3>
          <p>${q ? 'മറ്റൊരു പേരോ ഫോൺ നമ്പറോ നൽകി നോക്കുക.' : 'Google Sheets-ൽ രജിസ്റ്റർ ചെയ്ത കുടുംബങ്ങൾ ഇവിടെ ദൃശ്യമാകും.'}</p>
        </div>
      `;
    }
    return;
  }

  listEl.innerHTML = filtered.slice().reverse().map(f => {
    const waUrl = makeFamilyWhatsAppUrl(f, b);
    return `
      <article class="family-budget-card">
        <div class="family-top">
          <span class="avatar">${escapeHtml(Array.from(f.familyHead)[0]?.toUpperCase() || 'F')}</span>
          <div class="family-meta">
            <h3>${escapeHtml(f.familyHead)}</h3>
            <p>+91 ${escapeHtml(f.phone)}</p>
          </div>
          <div class="family-due-wrap">
            <span class="due-label">DUE</span>
            <strong class="due-amount">₹${f.totalDue.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div class="family-members-chips">
          ${f.members.map(m => `
            <div class="member-tag ${m.category}-tag">
              <span class="m-name">${escapeHtml(m.name)}</span>
              <span class="m-sep">:</span>
              <span class="m-amt">${m.amountText}</span>
              <span class="m-badge ${m.category}">${m.typeText}</span>
            </div>
          `).join('')}
        </div>

        ${(b.travel > 0 || b.dinner > 0 || b.other > 0) ? `
          <div class="budget-itemized-pills">
            <span>🏨 Resort: ₹${f.resortShare.toLocaleString('en-IN')}</span>
            ${f.travelShare ? `<span>🚌 Travel: ₹${f.travelShare.toLocaleString('en-IN')}</span>` : ''}
            ${f.dinnerShare ? `<span>🍽️ Dinner: ₹${f.dinnerShare.toLocaleString('en-IN')}</span>` : ''}
            ${f.otherShare ? `<span>🏷️ Other: ₹${f.otherShare.toLocaleString('en-IN')}</span>` : ''}
          </div>
        `: ''}

        <div class="family-budget-actions">
          <a class="whatsapp-btn" href="${waUrl}" target="_blank" rel="noopener">
            <span>💬 Send via WhatsApp</span>
          </a>
          <button type="button" class="paid-toggle-btn ${f.isPaid ? 'is-paid' : ''}" data-paid-phone="${escapeHtml(f.phone)}">
            ${f.isPaid ? '✓ Paid' : '○ Mark Paid'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

// Admin dialog inputs
$('#budget-resort')?.addEventListener('input', e => {
  const val = Number(e.target.value);
  if (val > 5000) {
    budgetConfig.resort = val;
    delete budgetConfig.rateAdult;
  } else {
    budgetConfig.rateAdult = e.target.value;
    delete budgetConfig.resort;
  }
  persistBudget();
  renderBudget();
});
$('#rate-kid-manual')?.addEventListener('input', e => {
  budgetConfig.rateKid = e.target.value;
  persistBudget();
  renderBudget();
});
$('#budget-travel')?.addEventListener('input', e => {
  budgetConfig.travel = e.target.value;
  persistBudget();
  renderBudget();
});
$('#budget-dinner')?.addEventListener('input', e => {
  budgetConfig.dinner = e.target.value;
  persistBudget();
  renderBudget();
});
$('#budget-other')?.addEventListener('input', e => {
  budgetConfig.other = e.target.value;
  persistBudget();
  renderBudget();
});

let activeBudgetCat = 'resort';
function switchBudgetCat(cat) {
  activeBudgetCat = cat;
  document.querySelectorAll('.budget-cat-btn').forEach(btn => {
    const on = btn.dataset.cat === cat;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('.cat-panel').forEach(p => {
    p.hidden = p.id !== `cat-panel-${cat}`;
  });
  play('click');
}

document.addEventListener('click', e => {
  const catBtn = e.target.closest('.budget-cat-btn');
  if (catBtn && catBtn.dataset.cat) {
    switchBudgetCat(catBtn.dataset.cat);
    return;
  }
  const paidBtn = e.target.closest('[data-paid-phone]');
  if (paidBtn) {
    togglePaid(paidBtn.dataset.paidPhone);
    return;
  }
});

$('#budget-search')?.addEventListener('input', e => {
  budgetSearchQuery = e.target.value;
  renderBudget();
});

$('#copy-budget-summary')?.addEventListener('click', async () => {
  const b = computeBudget(budgetConfig, records);
  const text = makeGroupSummaryText(b);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      notify('📋 WhatsApp budget summary copied to clipboard!');
      play('celebrate');
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      notify('📋 WhatsApp budget summary copied to clipboard!');
      play('celebrate');
    }
  } catch {
    notify('Could not copy to clipboard.');
  }
});

$('#open-budget-admin')?.addEventListener('click', () => {
  renderBudget();
  $('#budget-admin-dialog')?.showModal();
  play('click');
});
$('#close-budget-admin')?.addEventListener('click', () => {
  $('#budget-admin-dialog')?.close();
  play('click');
});
$('#save-budget-admin')?.addEventListener('click', () => {
  persistBudget();
  renderBudget();
  $('#budget-admin-dialog')?.close();
  notify('✅ ബഡ്ജറ്റ് വിവരങ്ങൾ പുതുക്കി! (Budget updated)');
  play('celebrate');
});

// App initialization (after all definitions)
addMember(false);
renderList();
renderBudget();
sync(true);
setInterval(() => { if (!document.hidden) sync(false); }, 30000);
window.addEventListener('online', () => sync(true));
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(false); });
window.addEventListener('pageshow', event => { if (event.persisted) sync(false); });
window.addEventListener('storage', e => {
  if (e.key === KEY) { records = readCache(); renderList(); renderBudget(); validate(); }
  if (e.key === BUDGET_KEY || e.key === PAID_KEY) { budgetConfig = readBudgetConfig(); renderBudget(); }
});

// Quiet, low-density ambient fireflies. Paused while hidden or reduced motion is preferred.
const canvas = $('#fireflies'), ctx = canvas.getContext('2d'), motion = matchMedia('(prefers-reduced-motion: reduce)'); let particles = [], last = 0;
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; particles = Array.from({ length: 24 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.4 + .3, v: Math.random() * .14 + .04, p: Math.random() * 6 })); } resize(); window.addEventListener('resize', resize); function draw(t) { requestAnimationFrame(draw); if (motion.matches || document.hidden || t - last < 45) return; last = t; ctx.clearRect(0, 0, canvas.width, canvas.height); for (const p of particles) { p.y -= p.v; p.x += Math.sin(t / 6000 + p.p) * .14; if (p.y < 0) p.y = canvas.height; ctx.beginPath(); ctx.fillStyle = `rgba(95,222,171,${.12 + .16 * (1 + Math.sin(t / 2200 + p.p))})`; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } } requestAnimationFrame(draw);

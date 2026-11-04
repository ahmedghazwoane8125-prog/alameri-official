/* Member actions gate for publicly readable literary pages.
   IMPORTANT: UI restrictions do not make static HTML / poems.json private. */
(()=>{'use strict';
 let member=false;
 const targets=['#copy-button','#share-button','#dialog-share','#dialog-copy',
                '.extra-reader-controls button','.poem-actions button',
                '.reader-tools button'];
 function notice(){
  let box=document.getElementById('guest-action-notice');
  if(box){box.remove();return}
  box=document.createElement('div');box.id='guest-action-notice';
  box.setAttribute('role','alertdialog');box.setAttribute('aria-label','التسجيل مطلوب');
  const message=document.createElement('p');message.textContent='النسخ والمشاركة متاحان للأعضاء بعد تسجيل الدخول. يمكنك قراءة النص الآن.';
  const link=document.createElement('a');link.href=location.pathname.includes('/poems/')?'../studio/#account':'studio/#account';link.textContent='تسجيل الدخول أو إنشاء حساب';
  const close=document.createElement('button');close.type='button';close.textContent='إغلاق';close.addEventListener('click',()=>box.remove());
  box.append(message,link,close);document.body.append(box);close.focus();
 }
 const style=document.createElement('style');
 style.textContent=`
  body:not(.member-verified) .verse-text,
  body:not(.member-verified) .poem-preview,
  body:not(.member-verified) .dialog-poem,
  body:not(.member-verified) .poetry-text,
  body:not(.member-verified) #dialog-poem-body,
  body:not(.member-verified) .poem-verses{user-select:none;-webkit-user-select:none}
  #guest-action-notice{position:fixed;z-index:500;bottom:25px;right:18px;left:18px;width:min(440px,calc(100vw - 36px));margin:auto;padding:18px 20px;background:#231f1a;color:#fff4e6;border:1px solid #bd995b;border-radius:17px;box-shadow:0 14px 55px #0009;font:600 14px/1.85 'Cairo',Arial,sans-serif;text-align:center}
  #guest-action-notice a,#guest-action-notice button{display:inline-flex;margin:5px 4px;border:1px solid #ae8652;border-radius:9px;padding:6px 10px;color:#f5d6a4;text-decoration:none;font:inherit;background:transparent}
 `;
 document.head.append(style);
 function protectedTextNode(n){
  const e=n?.nodeType===1?n:n?.parentElement;
  return !!e?.closest('.verse-text,.poem-preview,.dialog-poem,.poetry-text,#dialog-poem-body,.poem-verses,#reader-poem');
 }
 document.addEventListener('click',e=>{
  if(member)return;
  const b=e.target.closest('button');if(!b)return;
  if(!targets.some(sel=>b.matches(sel)))return;
  const label=(b.textContent||'').trim();
  if(!/نسخ|اقتباس|مشاركة|شارك|copy|share/i.test(label)&&!['copy-button','share-button','dialog-share'].includes(b.id))return;
  e.preventDefault();e.stopImmediatePropagation();notice()
 },true);
 document.addEventListener('copy',e=>{
  if(member)return;const selection=window.getSelection();
  if(protectedTextNode(selection?.anchorNode)||protectedTextNode(selection?.focusNode)){e.preventDefault();notice()}
 },true);
 document.addEventListener('selectstart',e=>{if(!member&&protectedTextNode(e.target))e.preventDefault()},true);
 document.addEventListener('contextmenu',e=>{if(!member&&protectedTextNode(e.target))e.preventDefault()},true);
 async function init(){
  const cfg=window.ALAMERI_SUPABASE;
  if(!cfg?.url||!cfg?.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  try{const {data}=await client.auth.getUser();member=!!data?.user;document.body.classList.toggle('member-verified',member)}catch(_){}
  client.auth.onAuthStateChange((_event,session)=>{member=!!session?.user;document.body.classList.toggle('member-verified',member)})
 }
 init();
})();
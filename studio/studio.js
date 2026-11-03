/* AL-AMERI Literary Studio — public client only; all permissions enforced by Supabase RLS */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const root=document.documentElement;
const BASE='../';
const LOCAL_DRAFT='alameri-studio-draft-v1', LOCAL_THEME='alameri-studio-theme';
const state={poems:[],reader:null,readerSize:23,size:23,theme:'light',autoTashkeel:false,client:null,user:null,profile:null,readerPaper:'paper',editing:false};
const safeText=v=>String(v==null?'':v);
const esc=s=>safeText(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=t=>{$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3800)};
function el(tag,cl,txt){const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=safeText(txt);return e}
function localRead(k){try{return localStorage.getItem(k)}catch(e){return null}}
function localWrite(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('تم نسخ النص');return true}catch(e){const box=document.createElement('textarea');box.value=t;document.body.append(box);box.select();const ok=document.execCommand('copy');box.remove();toast(ok?'تم النسخ':'تعذر النسخ');return ok}}
function jump(id){document.querySelectorAll('.section').forEach(s=>{s.hidden=s.id!==id});document.querySelectorAll('[data-jump]').forEach(b=>b.classList.toggle('active',b.dataset.jump===id));const section=$(id);if(!section)return;history.replaceState(null,'',location.pathname+'#'+id);window.scrollTo({top:0,behavior:'smooth'});if(id==='community')loadFeed();if(id==='review')loadApplications()}
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.jump)));
function themeSet(t){state.theme=t;root.dataset.theme=t;$('theme-toggle').textContent=t==='dark'?'☼':'☾';localWrite(LOCAL_THEME,t)}
themeSet(localRead(LOCAL_THEME)==='dark'?'dark':'light');
$('theme-toggle').addEventListener('click',()=>themeSet(state.theme==='dark'?'light':'dark'));
const THEME_READER=['paper','light','night'];
function applyPaper(id,paper){const e=$(id);e.classList.remove(...THEME_READER);e.classList.add(paper)}
function formatVerses(text,format='free',container){
 container.replaceChildren();
 const txt=safeText(text).trim();
 if(!txt){container.textContent='ستظهر أبياتك هنا أثناء الكتابة';return}
 if(format==='bayt'){
   const chunks=txt.split(/\n\s*\n/).filter(Boolean);
   chunks.forEach(c=>{
     const lines=c.split(/\n/).map(s=>s.trim()).filter(Boolean);
     for(let i=0;i<lines.length;i+=2){const row=el('div','bayt-row');row.append(el('span','',lines[i]),el('span','',lines[i+1]||''));container.append(row)}
   });
 }else container.textContent=txt;
}
const TASHKEEL=new Map(Object.entries({'في':'فِي','من':'مِنْ','على':'عَلَى','إلى':'إِلَى','يا':'يَا','هذا':'هَذَا','هذه':'هَذِهِ','ذلك':'ذَلِكَ','الذي':'الَّذِي','التي':'الَّتِي','الليل':'اللَّيْل','القلب':'الْقَلْب','النور':'النُّور','الحب':'الْحُبّ','الشعر':'الشِّعْر','الصبر':'الصَّبْر','الروح':'الرُّوح','الأمل':'الْأَمَل','الوطن':'الْوَطَن','أنا':'أَنَا','أنت':'أَنْتَ','نحن':'نَحْنُ','كان':'كَانَ'}));
const hasDiacritics=/[\u064b-\u065f\u0670]/;
function assisted(t){return t.replace(/[\u0621-\u064a]+/g,word=>hasDiacritics.test(word)?word:(TASHKEEL.get(word)||word))}
function currentDraft(){return{title:$('draft-title').value.trim(),kind:$('draft-kind').value,category:$('draft-category').value,layout:$('draft-layout').value,body:$('draft-body').value}}
function setDraft(v){$('draft-title').value=v.title||'';$('draft-kind').value=v.kind||'poem';$('draft-category').value=v.category||'';$('draft-layout').value=v.layout||'free';$('draft-body').value=v.body||'';renderDraft()}
function renderDraft(){
 const d=currentDraft();$('preview-title').textContent=d.title||'عنوان القصيدة';
 const preview=state.autoTashkeel?assisted(d.body):d.body;
 formatVerses(preview,d.layout,$('preview-body'));
 $('word-count').textContent=(d.body.trim()?d.body.trim().split(/\s+/).length:0)+' كلمة';
 $('preview-paper').style.setProperty('--live-size',state.size+'px');
 $('preview-body').style.fontSize=state.size+'px';
}
let saveTimer;
function autoSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{localWrite(LOCAL_DRAFT,JSON.stringify({...currentDraft(),saved_at:new Date().toISOString()}))},700)}
['draft-title','draft-body','draft-kind','draft-category','draft-layout'].forEach(id=>$(id).addEventListener('input',()=>{renderDraft();autoSave()}));
$('save-draft').addEventListener('click',()=>{toast(localWrite(LOCAL_DRAFT,JSON.stringify({...currentDraft(),saved_at:new Date().toISOString()}))?'حُفظت المسودة على هذا الجهاز':'تعذر الحفظ المحلي')});
$('restore-draft').addEventListener('click',()=>{const s=localRead(LOCAL_DRAFT);if(!s){toast('لا توجد مسودة محفوظة');return}try{setDraft(JSON.parse(s));toast('استُعيدت المسودة')}catch(e){toast('تعذر قراءة المسودة')}});
$('export-draft').addEventListener('click',()=>{const d=currentDraft();if(!d.body.trim()){toast('اكتب نصا أولا');return}const text=[d.title||'بلا عنوان','',d.body].join('\n');const a=el('a');const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=((d.title||'مسودة').replace(/[\/\\:*?"<>|]/g,'_')).slice(0,70)+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)});
$('copy-draft').addEventListener('click',()=>copy([$('draft-title').value,$('draft-body').value].filter(Boolean).join('\n\n')));
$('insert-bayt').addEventListener('click',()=>insertText('\n\n'));
$('insert-quote').addEventListener('click',()=>insertText('«»',1));
$('insert-tashkeel').addEventListener('click',()=>{$('harakat-panel').hidden=!$('harakat-panel').hidden});
document.querySelectorAll('[data-mark]').forEach(b=>b.addEventListener('click',()=>insertText(b.dataset.mark)));
function insertText(t,caretOffset=0){const x=$('draft-body'),a=x.selectionStart,b=x.selectionEnd;x.value=x.value.slice(0,a)+t+x.value.slice(b);x.focus();x.setSelectionRange(a+t.length-caretOffset,a+t.length-caretOffset);renderDraft();autoSave()}
$('assisted-tashkeel').addEventListener('click',()=>{state.autoTashkeel=!state.autoTashkeel;$('assisted-tashkeel').textContent=state.autoTashkeel?'إيقاف التشكيل المساعد':'تشكيل مساعد';renderDraft();toast(state.autoTashkeel?'معاينة تشكيل تجريبي، دون تعديل الأصل':'أوقفت التشكيل المساعد')});
$('font-minus').addEventListener('click',()=>{state.size=Math.max(16,state.size-2);updateFont()});
$('font-plus').addEventListener('click',()=>{state.size=Math.min(38,state.size+2);updateFont()});
function updateFont(){$('font-size').textContent=state.size;renderDraft()}
$('font-select').addEventListener('change',e=>{$('preview-paper').classList.remove('font-amiri','font-cairo');$('preview-paper').classList.add('font-'+e.target.value)});
$('ink-select').addEventListener('change',e=>{$('preview-paper').classList.remove('ink-default','ink-ink','ink-blue','ink-gold');$('preview-paper').classList.add('ink-'+e.target.value)});
$('paper-select').addEventListener('change',e=>applyPaper('preview-paper',e.target.value));
$('quote-selection').addEventListener('click',()=>{const s=window.getSelection()?.toString().trim()||$('draft-body').value.trim();if(!s)return toast('حدد نصا أولا');copy('«'+s+'»'+($('draft-title').value?'\n— '+$('draft-title').value:''))});
async function shareText(d){const txt=[d.title,d.body].filter(Boolean).join('\n\n');if(!txt)return toast('لا يوجد نص لمشاركته');if(navigator.share){try{await navigator.share({title:d.title||'نص أدبي',text:txt});return}catch(e){if(e.name==='AbortError')return}}await copy(txt)}
$('share-draft').addEventListener('click',()=>shareText(currentDraft()));
async function loadLibrary(){
 try{
  const r=await fetch('../poems.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const d=await r.json();state.poems=Array.isArray(d.poems)?d.poems.filter(p=>p&&p.title&&p.text):[];
  const categories=[...new Set(state.poems.map(x=>x.category).filter(Boolean))];for(const c of categories){const opt=el('option','',c);opt.value=c;$('poem-category').append(opt)}renderLibrary();
 }catch(e){$('poem-grid').replaceChildren(el('div','empty','تعذر تحميل المكتبة حاليا. يمكنك فتح القصائد من الصفحة الرئيسية.'))}
}
function renderLibrary(){
 const q=$('poem-search').value.trim().toLocaleLowerCase('ar'),cat=$('poem-category').value;
 const matches=state.poems.filter(p=>(!cat||p.category===cat)&&(!q||[p.title,p.text,p.category].join(' ').toLocaleLowerCase('ar').includes(q)));
 $('library-count').textContent=matches.length+' من '+state.poems.length+' أعمال';
 const grid=$('poem-grid');grid.replaceChildren();
 if(!matches.length){grid.append(el('div','empty','لا توجد قصائد تطابق البحث'));return}
 for(const p of matches){
  const card=el('article','poem-tile'),label=el('span','tile-label',p.category||'قصيدة'),title=el('h3','',p.title),sub=el('p','',p.text.trim().split('\n').filter(Boolean).slice(0,2).join('\n')),foot=el('div','tile-foot'),view=el('button','button outline','اقرأ القصيدة'),link=el('a','tile-label','الصفحة المستقلة');
  view.type='button';view.addEventListener('click',()=>openReader(p));link.href='../poems/'+encodeURIComponent(p.id)+'.html';
  foot.append(view,link);card.append(label,title,sub,foot);grid.append(card)
 }
}
$('poem-search').addEventListener('input',renderLibrary);$('poem-category').addEventListener('change',renderLibrary);
function openReader(p){
 state.reader=p;$('reader-title').textContent=p.title;$('reader-meta').textContent=(p.category||'قصيدة')+' — عبد الحفيظ بن منصور العامري';
 const host=$('reader-poem');host.replaceChildren();
 if(p.bad?.text){const h=el('h3','',p.bad.title||'البدع'),by=el('p','muted','للشاعر: '+(p.bad.author||'غير محدد')),text=el('div','poetry-text',p.bad.text);host.append(h,by,text,document.createElement('hr'));const h2=el('h3','',p.answer?.title||'الجواب'),by2=el('p','muted','عبد الحفيظ بن منصور العامري');host.append(h2,by2)}
 host.append(el('div','poetry-text',p.text));
 const dlg=$('reader');if(!dlg.open)dlg.showModal();
}
$('reader-close').addEventListener('click',()=>$('reader').close());
$('reader').addEventListener('click',e=>{if(e.target===$('reader'))$('reader').close()});
$('reader-larger').addEventListener('click',()=>{state.readerSize=Math.min(38,state.readerSize+2);$('reader-poem').style.fontSize=state.readerSize+'px';$('reader-poem').querySelectorAll('.poetry-text').forEach(e=>e.style.fontSize=state.readerSize+'px')});
$('reader-smaller').addEventListener('click',()=>{state.readerSize=Math.max(16,state.readerSize-2);$('reader-poem').querySelectorAll('.poetry-text').forEach(e=>e.style.fontSize=state.readerSize+'px')});
$('reader-paper').addEventListener('click',()=>{state.readerPaper=THEME_READER[(THEME_READER.indexOf(state.readerPaper)+1)%3];applyPaper('reader-paperarea',state.readerPaper)});
$('reader-copy').addEventListener('click',()=>{if(state.reader)copy([state.reader.title,state.reader.bad?.text?'البدع:\n'+state.reader.bad.text:'',state.reader.text].filter(Boolean).join('\n\n'))});
$('reader-share').addEventListener('click',()=>{if(state.reader)shareText(state.reader)});
$('reader-quote').addEventListener('click',()=>{const selected=window.getSelection()?.toString().trim();if(selected)copy('«'+selected+'»\n— '+state.reader.title);else toast('حدد بيتا أو عبارة من النص أولا')});
const conf=window.ALAMERI_SUPABASE||{},configured=Boolean(/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(conf.url||'')&&typeof conf.anonKey==='string'&&conf.anonKey.length>40);
function connMessage(msg,ok=false){$('backend-status').textContent=msg;$('backend-status').className='status-banner '+(ok?'connected':'not-connected')}
function setRole(role){const names={member:'عضو',poet:'شاعر معتمد',verified_poet:'شاعر موثّق',reviewer:'لجنة المراجعة',admin:'مدير المنصة'};$('member-badge').textContent=names[role]||'زائر'}
function requiresUser(){if(!state.client){toast('إنشاء الحسابات والنشر العام يحتاجان ربط Supabase بقاعدة البيانات');return false}if(!state.user){toast('سجل الدخول أولا');jump('account');return false}return true}
function updateLogin(){
 const active=Boolean(state.user);
 for(const node of $('profile-form').querySelectorAll('input,textarea,select,button'))node.disabled=!active;
 $('logout').hidden=!active;
 $('login-form').hidden=active || $('tab-register').classList.contains('selected');
 $('register-form').hidden=active || !$('tab-register').classList.contains('selected');
 $('auth-message').textContent=active?'تم تسجيل الدخول: '+state.user.email:!configured?'العضوية لم تُربط بعد بخدمة Supabase. محرر المسودات يعمل دون تسجيل.':'يمكنك الآن إنشاء حساب أو تسجيل الدخول';
 $('account-top').textContent=active?'ملفي الشخصي':'حسابي';setRole(state.profile?.role)
}
function switchAuth(which){$('tab-login').classList.toggle('selected',which==='login');$('tab-register').classList.toggle('selected',which==='register');updateLogin()}
$('tab-login').addEventListener('click',()=>switchAuth('login'));$('tab-register').addEventListener('click',()=>switchAuth('register'));
async function fetchProfile(){
 if(!state.user||!state.client)return;
 const {data,error}=await state.client.from('profiles').select('*').eq('id',state.user.id).maybeSingle();
 if(error){toast('تعذر تحميل الملف الشخصي');return}
 state.profile=data||null;
 if(data){$('profile-name').value=data.display_name||'';$('profile-pen').value=data.pen_name||'';$('profile-country').value=data.country||'';$('profile-city').value=data.city||'';$('profile-bio').value=data.bio||'';$('profile-website').value=data.website||''}
 const {data:privateData}=await state.client.from('private_contacts').select('whatsapp_visibility').eq('user_id',state.user.id).maybeSingle();
 $('whatsapp-privacy').value=privateData?.whatsapp_visibility||'private';updateLogin();
 const review=['reviewer','admin'].includes(state.profile?.role);$('review-nav').hidden=!review;if(!review)$('review').hidden=true;
}
async function activateBackend(){
 if(!configured){connMessage('وضع المعاينة: الديوان والقراءة والمحرر والحفظ المحلي تعمل الآن. حسابات الأعضاء والنشر والمراجعة تحتاج إعداد Supabase وتشغيل مخطط قاعدة البيانات.');updateLogin();return}
 if(!window.supabase?.createClient){connMessage('تعذر تحميل مكتبة تسجيل الدخول. تحقق من الاتصال أو من إعدادات الحجب.');return}
 try{
  state.client=window.supabase.createClient(conf.url,conf.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await state.client.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')throw error;
  state.user=data?.user||null;await fetchProfile();updateLogin();connMessage('خدمة الأعضاء متصلة بقاعدة البيانات. تسجيل الدخول والنشر يخضعان للصلاحيات.',true);loadFeed();
  state.client.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;if(!state.user)state.profile=null;setTimeout(()=>{fetchProfile().finally(updateLogin);loadFeed()},50)})
 }catch(e){connMessage('تعذر الاتصال بخدمة الحسابات: '+(e.message||'خطأ اتصال'));state.client=null;updateLogin()}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!state.client)return toast('خدمة الأعضاء لم تُفعّل بعد');
 const {error}=await state.client.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});
 toast(error?'تعذر الدخول: '+error.message:'تم تسجيل الدخول');if(!error)await fetchProfile()
});
$('register-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!state.client)return toast('خدمة الأعضاء لم تُفعّل بعد');
 const pass=$('reg-password').value;if(pass!==$('reg-confirm').value)return toast('كلمتا المرور غير متطابقتين');
 if(!$('reg-terms').checked)return toast('يرجى الموافقة على شروط الاستخدام');
 const {data,error}=await state.client.auth.signUp({email:$('reg-email').value.trim(),password:pass,options:{emailRedirectTo:location.origin+location.pathname,data:{display_name:$('reg-name').value.trim(),whatsapp:$('reg-whatsapp').value.trim()}}});
 toast(error?'تعذر إنشاء الحساب: '+error.message:'تم تقديم طلب التسجيل. تحقق من بريدك الإلكتروني للتفعيل.');if(data?.session)await fetchProfile()
});
$('logout').addEventListener('click',async()=>{if(!state.client)return;const {error}=await state.client.auth.signOut();if(error)toast(error.message);else{state.user=null;state.profile=null;updateLogin();toast('تم تسجيل الخروج')}});
$('profile-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!requiresUser())return;
 const d={display_name:$('profile-name').value.trim(),pen_name:$('profile-pen').value.trim(),bio:$('profile-bio').value.trim(),country:$('profile-country').value.trim(),city:$('profile-city').value.trim(),website:$('profile-website').value.trim()||null};
 const {error}=await state.client.from('profiles').update(d).eq('id',state.user.id);
 if(error)return toast('لم يُحفظ الملف: '+error.message);
 const {error:privacyError}=await state.client.from('private_contacts').update({whatsapp_visibility:$('whatsapp-privacy').value}).eq('user_id',state.user.id);
 toast(privacyError?'حفظ الملف لكن تعذر تحديث خصوصية التواصل':'حُفظ الملف الشخصي');fetchProfile()
});
$('publish-draft').addEventListener('click',async()=>{
 if(!requiresUser())return;
 const d=currentDraft();if(d.body.trim().length<10||!d.title)return toast('أدخل عنوانا ونصا كاملا');
 if(!$('ownership-confirm').checked)return toast('يجب الإقرار بملكية النص قبل النشر');
 const poet=['poet','verified_poet','admin'].includes(state.profile?.role);
 if(d.kind==='poem'&&!poet){toast('نشر القصائد الرسمية للشعراء المعتمدين فقط. يمكن للعضو نشر مشاركة أدبية.');return}
 if(!confirm('هل تريد نشر هذا النص علنا في المنصة؟'))return;
 const {error}=await state.client.from('posts').insert({author_id:state.user.id,title:d.title,body:d.body,category:d.category||null,kind:d.kind,publication_status:'published'});
 if(error)return toast('تعذر النشر: '+error.message);
 toast('تم نشر النص في قسم المجتمع الأدبي');jump('community')
});
$('poet-application-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!requiresUser())return;
 const urls=[$('app-link').value.trim(),$('app-link2').value.trim()].filter(Boolean);
 if(urls.length<2)return toast('يرجى إضافة رابطين عامين موثقين لأعمالك الأدبية');
 if(!$('app-ownership').checked)return toast('يجب إقرار ملكية النص');
 const data={applicant_id:state.user.id,pen_name:$('app-pen').value.trim(),biography:$('app-bio').value.trim(),poetry_style:$('app-style').value,examples:$('app-samples').value,reference_urls:urls,status:'submitted'};
 const {error}=await state.client.from('poet_applications').insert(data);
 toast(error?'تعذر إرسال الطلب: '+error.message:'تم إرسال طلب الشاعر إلى لجنة المراجعة')
});
async function loadFeed(){
 if(!state.client)return;
 const {data,error}=await state.client.from('posts').select('id,title,body,kind,category,created_at,author_id,profiles!posts_author_id_fkey(display_name,pen_name)').eq('publication_status','published').order('created_at',{ascending:false}).limit(40);
 const host=$('feed-list');host.replaceChildren();
 if(error){host.append(el('div','empty','تعذر تحميل المشاركات الآن'));return}
 if(!data?.length){host.append(el('div','empty','لا توجد مشاركات منشورة حتى الآن'));return}
 for(const post of data){
  const card=el('article','feed-item'),label=el('span','gold-kicker',post.kind==='poem'?'قصيدة رسمية':'مشاركة أدبية'),h=el('h3','',post.title),by=el('span','muted',post.profiles?.pen_name||post.profiles?.display_name||'كاتب'),t=el('p','',post.body),actions=el('div','feed-actions'),like=el('button','button outline','إعجاب'),quote=el('button','button outline','اقتباس'),comment=el('button','button outline','تعليق');
  like.addEventListener('click',async()=>{if(!requiresUser())return;const {data:liked,error:lookupError}=await state.client.from('post_likes').select('post_id').eq('post_id',post.id).eq('user_id',state.user.id).maybeSingle();if(lookupError)return toast('تعذر جلب حالة الإعجاب');if(liked){const {error}=await state.client.from('post_likes').delete().eq('post_id',post.id).eq('user_id',state.user.id);toast(error?'تعذر إزالة الإعجاب':'أزلت الإعجاب')}else{const {error}=await state.client.from('post_likes').insert({post_id:post.id,user_id:state.user.id});toast(error?'تعذر تسجيل الإعجاب':'تم تسجيل الإعجاب')}});
  quote.addEventListener('click',()=>copy('«'+post.body+'»\n— '+post.title+' / '+by.textContent));
  comment.addEventListener('click',async()=>{if(!requiresUser())return;const body=prompt('اكتب تعليقا محترما (حتى 1000 حرف)');if(!body?.trim())return;if(body.length>1000)return toast('التعليق طويل جدا');const {error}=await state.client.from('comments').insert({post_id:post.id,author_id:state.user.id,body:body.trim()});toast(error?'تعذر نشر التعليق':'تم نشر التعليق')});
  actions.append(like,quote,comment);card.append(label,h,by,t,actions);host.append(card)
 }
}
async function loadApplications(){
 if(!state.client||!['reviewer','admin'].includes(state.profile?.role))return;
 const host=$('review-items');host.replaceChildren();
 const {data,error}=await state.client.from('poet_applications').select('*').in('status',['submitted','under_review','needs_info']).order('created_at',{ascending:true}).limit(100);
 if(error){host.append(el('div','empty','تعذر تحميل طلبات المراجعة'));return}
 if(!data?.length){host.append(el('div','empty','لا توجد طلبات تحتاج المراجعة'));return}
 for(const app of data){
  const card=el('article','feed-item');card.append(el('span','gold-kicker',app.status),el('h3','',app.pen_name),el('p','',app.biography),el('p','',app.examples),el('p','muted',(app.reference_urls||[]).join(' | ')));
  const actions=el('div','feed-actions');
  const isAdmin=state.profile.role==='admin';
  const decisions=isAdmin?[['approve','اعتماد كشاعر'],['reject','رفض مع السبب'],['needs_info','طلب استكمال']]:[['recommend_approve','اقتراح قبول'],['recommend_reject','اقتراح رفض'],['needs_info','طلب استكمال']];
  for(const [decision,label]of decisions){const btn=el('button','button outline',label);btn.type='button';btn.addEventListener('click',async()=>{const note=prompt('أدخل ملاحظات المراجعة وأسباب القرار');if(!note?.trim())return;const {error}=await state.client.rpc('review_poet_application',{application_uuid:app.id,decision_input:decision,note_input:note.trim()});toast(error?'فشل حفظ القرار: '+error.message:'حُفظ قرار المراجعة');if(!error)loadApplications()});actions.append(btn)}
  card.append(actions);host.append(card)
 }
}
const hash=decodeURIComponent(location.hash.slice(1));if(['library','editor','community','account','application'].includes(hash))jump(hash);else jump('library');
renderDraft();updateLogin();loadLibrary();activateBackend();
})();
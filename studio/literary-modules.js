/* AL-AMERI literary modules: private diwans, versioned drafts, explicit editorial approval.
   This module never imports, edits or publishes original static poems. */
(()=>{'use strict';
const A=window.ALAMERI_STUDIO,$=id=>document.getElementById(id);
if(!A||!$('diwan-create-form'))return;
const local={draftId:null,diwans:[],activeUserId:null};
const labels={draft:'مسودة خاصة',submitted:'بانتظار اعتماد المدير',published:'منشور ومعتمد',rejected:'أعيد للمراجعة'};
const el=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=String(txt);return n};
const button=(txt,fn,cl='button outline')=>{const n=el('button',cl,txt);n.type='button';n.addEventListener('click',fn);return n};
const say=t=>A.toast(t);
const status=(id,message)=>{const node=$(id);if(node)node.textContent=String(message)};
const clear=(host,t)=>{host.replaceChildren();if(t)host.append(el('div','empty',t))};
const auth=()=>{const c=A.client(),u=A.user();if(!c||!u){say('سجّل الدخول أولًا لحفظ أعمالك أو إدارتها');A.jump('account');return null}return{c,u,role:A.role()}};
const canSubmit=r=>['poet','verified_poet','admin'].includes(r);
const statusTag=e=>el('span','role-pill',labels[e.status]||e.status);
const panel=(h,t)=>{const p=el('article','diwan-tile');p.append(el('h3','',h));if(t)p.append(el('p','muted',t));return p};

async function publicDiwans(){
 const host=$('diwan-public-list'),c=A.client();clear(host,'جار تحميل الدواوين المعتمدة…');
 if(!c){clear(host,'لا تتوفر خدمة الدواوين الآن');return}
 const {data,error}=await c.from('literary_diwans').select('id,title,description,owner_id,status').eq('status','published').order('created_at',{ascending:false}).limit(30);
 if(error){clear(host,'تعذر تحميل الدواوين: '+error.message);return}
 if(!data?.length){clear(host,'لم تُعتمد أي دواوين جديدة حتى الآن. القصائد الأصلية متاحة في مكتبة القصائد.');return}
 host.replaceChildren();
 for(const d of data){
  const card=panel(d.title,d.description),list=el('div','diwan-poem-list');card.append(statusTag(d));
  const reveal=button('عرض القصائد المعتمدة',async()=>{
   if(!list.hidden&&list.childElementCount){list.hidden=true;return}
   list.hidden=false;clear(list,'جار تحميل القصائد…');
   const {data:poems,error:err}=await c.from('diwan_poems').select('title,body,category').eq('diwan_id',d.id).eq('status','published').order('position',{ascending:true}).limit(80);
   if(err){clear(list,'تعذر تحميل القصائد');return}
   clear(list,!poems?.length?'لا توجد قصائد منشورة في هذا الديوان':null);
   for(const poem of poems||[]){
    const details=el('details','diwan-poem-text'),summary=el('summary','',poem.title),body=el('div','poetry-text',poem.body);
    details.append(summary,body);list.append(details)
   }
  });
  list.hidden=true;card.append(reveal,list);host.append(card)
 }
}
async function myDiwans(){
 const host=$('diwan-owner-list'),pick=$('poem-diwan-id'),session=auth();
 if(!session){clear(host,'سجّل الدخول لإنشاء وإدارة دواوينك الخاصة');pick.replaceChildren(el('option','','سجّل الدخول أولًا'));return}
 const {c,u,role}=session;const {data,error}=await c.from('literary_diwans').select('id,title,description,status,review_note,created_at').eq('owner_id',u.id).order('created_at',{ascending:false}).limit(80);
 if(A.user()?.id!==u.id)return;
 if(error){clear(host,'تعذر تحميل الدواوين الخاصة: '+error.message);return}
 local.diwans=data||[];pick.replaceChildren();const first=el('option','','اختر ديوانًا تملكه');first.value='';pick.append(first);
 for(const d of local.diwans){const opt=el('option','',d.title+' — '+(labels[d.status]||d.status));opt.value=d.id;pick.append(opt)}
 if(!data?.length){clear(host,'لم تنشئ أي ديوان خاص بعد. ابدأ من النموذج أعلاه.');return}
 host.replaceChildren();
 for(const d of data){
  const card=panel(d.title,d.description);card.append(statusTag(d));
  if(d.review_note)card.append(el('p','tiny-note','ملاحظة المراجعة: '+d.review_note));
  if(['draft','rejected'].includes(d.status)){
   card.append(button('إرسال الديوان للاعتماد',async()=>{
    if(!canSubmit(role))return say('يجب اعتمادك كشاعر أولًا لتقديم ديوان رسمي');
    if(!confirm('هل تريد تقديم الديوان للمراجعة؟ لا يُنشر إلا عند اعتماد المدير الصريح.'))return;
    const {error}=await c.rpc('literary_action',{p_kind:'diwan',p_item_id:d.id,p_action:'submit',p_note:''});
    if(error)return say('تعذر تقديم الديوان: '+error.message);say('أُرسل الديوان للمراجعة دون نشر');await myDiwans();reviewQueue()
   }))
  }
  const poemsHost=el('div','diwan-poem-list');clear(poemsHost,'جار تحميل قصائد الديوان…');card.append(poemsHost);host.append(card);
  const {data:poems,error:poemErr}=await c.from('diwan_poems').select('id,title,body,category,status,position,review_note').eq('diwan_id',d.id).order('position',{ascending:true}).order('created_at',{ascending:true}).limit(100);
  if(A.user()?.id!==u.id)return;
  if(poemErr){clear(poemsHost,'تعذر تحميل القصائد: '+poemErr.message);continue}
  if(!poems?.length){clear(poemsHost,'لا توجد قصائد مضافة إلى هذا الديوان');continue}
  poemsHost.replaceChildren();
  for(const p of poems){
   const item=el('details','diwan-owner-poem'),summary=el('summary','',p.title+' — '+(labels[p.status]||p.status)),content=el('div','poetry-text',p.body);
   item.append(summary,content);
   if(p.review_note)item.append(el('p','tiny-note','ملاحظات المراجعة: '+p.review_note));
   if(['draft','rejected'].includes(p.status)){
    const edit=el('div','poem-edit-form'),title=el('input'),body=el('textarea'),cat=el('input');
    title.value=p.title;title.maxLength=120;title.setAttribute('aria-label','تعديل عنوان القصيدة');
    body.value=p.body;body.maxLength=30000;body.rows=6;body.setAttribute('aria-label','تعديل نص القصيدة');
    cat.value=p.category;cat.maxLength=100;cat.setAttribute('aria-label','تعديل التصنيف');
    edit.append(title,body,cat,button('حفظ تعديل المسودة',async()=>{
     if(title.value.trim().length<2||body.value.trim().length<10)return say('أدخل عنوانًا ونصًا صالحين');
     const {error}=await c.from('diwan_poems').update({title:title.value.trim(),body:body.value,category:cat.value.trim()}).eq('id',p.id).eq('author_id',u.id);
     if(error)return say('تعذر حفظ التعديل: '+error.message);say('حُفظ تعديل القصيدة كمسودة خاصة');myDiwans()
    }));
    edit.append(button('إرسال القصيدة للاعتماد',async()=>{
     if(!canSubmit(role))return say('يشترط اعتماد صفة شاعر قبل تقديم القصيدة رسميًا');
     if(!confirm('تقديم القصيدة للمراجعة لا ينشرها. هل تتابع؟'))return;
     const {error}=await c.rpc('literary_action',{p_kind:'poem',p_item_id:p.id,p_action:'submit',p_note:''});
     if(error)return say('تعذر تقديم القصيدة: '+error.message);say('أرسلت القصيدة للمراجعة دون نشر');myDiwans();reviewQueue()
    }));
    item.append(edit)
   }
   poemsHost.append(item)
  }
 }
}
async function reviewQueue(){
 const host=$('literary-review-list'),session=A.client()&&A.user()?{c:A.client(),role:A.role(),userId:A.user().id}:null;
 if(!session||session.role!=='admin'){clear(host,'هذه الصفحة مخصصة لمدير المنصة فقط');return}
 const {c}=session;
 const [dw,po]=await Promise.all([
  c.from('literary_diwans').select('id,title,description,owner_id,created_at').eq('status','submitted').order('created_at',{ascending:true}),
  c.from('diwan_poems').select('id,diwan_id,title,body,category,author_id,created_at').eq('status','submitted').order('created_at',{ascending:true})
 ]);
 if(A.user()?.id!==session.userId||A.role()!=='admin'){clear(host,'هذه الصفحة مخصصة لمدير المنصة فقط');return}
 if(dw.error||po.error){clear(host,'تعذر تحميل طلبات الاعتماد');return}
 const entries=[...(po.data||[]).map(x=>({...x,kind:'poem'})),...(dw.data||[]).map(x=>({...x,kind:'diwan'}))];
 if(!entries.length){clear(host,'لا توجد أعمال جديدة تنتظر اعتمادك');return}
 host.replaceChildren();
 for(const entry of entries){
  const type=entry.kind==='poem'?'قصيدة':'ديوان';
  const card=panel(type+' بانتظار الاعتماد: '+entry.title,entry.kind==='poem'?entry.body:entry.description);
  card.append(el('p','tiny-note',entry.kind==='poem'?'اعتماد القصيدة يتيح ظهورها فقط داخل ديوان منشور ومعتمد. لن تظهر للزوار قبل نشر الديوان. راجع النص كاملًا.':'اعتماد الديوان يجعله عامًا ويعرض داخله القصائد التي سبق اعتمادها فقط. راجع المحتوى بعناية.'));
  const decide=async(action)=>{
   const message=action==='approve'
    ?'هل توافق صراحة على اعتماد '+type+' «'+entry.title+'»؟ '+(entry.kind==='poem'?'ستظهر للزوار فقط بعد اعتماد ديوانها.':'سيصبح الديوان والقصائد المعتمدة داخله مرئيين للزوار.')
    :'هل تريد رفض الطلب مع توثيق السبب؟';
   if(!confirm(message))return;
   let note='';
   if(action==='reject'){note=prompt('اذكر سبب الرفض ليتمكن صاحب النص من التصحيح')||'';if(!note.trim())return say('يجب توضيح سبب الرفض')}
   const {error}=await c.rpc('literary_action',{p_kind:entry.kind,p_item_id:entry.id,p_action:action,p_note:note});
   if(error)return say('تعذر حفظ القرار: '+error.message);
   say(action==='approve'?'تم الاعتماد الصريح':'تم رفض العمل مع تسجيل السبب');
   reviewQueue();publicDiwans();myDiwans()
  };
  card.append(button(entry.kind==='poem'?'اعتماد القصيدة صراحة':'اعتماد ونشر الديوان صراحة',()=>decide('approve'),'button primary'));
  card.append(button('رفض مع السبب',()=>decide('reject'),'button outline'));
  host.append(card)
 }
}
async function listDrafts(){
 const session=A.client()&&A.user()?{c:A.client(),u:A.user()}:null,pick=$('cloud-drafts-select');
 pick.replaceChildren();const first=el('option','','اختر مسودة محفوظة');first.value='';pick.append(first);
 if(!session){status('cloud-status','الحفظ المحلي متاح دون حساب، والحفظ السحابي يتطلب تسجيل الدخول.');return}
 const {data,error}=await session.c.from('literary_drafts').select('id,title,revision,updated_at').eq('author_id',session.u.id).order('updated_at',{ascending:false}).limit(100);
 if(A.user()?.id!==session.u.id)return;
 if(error){status('cloud-status','تعذر تحميل خزنة المسودات: '+error.message);return}
 for(const d of data||[]){const opt=el('option','',d.title+' — نسخة '+d.revision);opt.value=d.id;pick.append(opt)}
 if(local.draftId&&data?.some(d=>d.id===local.draftId))pick.value=local.draftId;
 status('cloud-status',(data?.length||0)+' مسودة خاصة في حسابك — لا يُنشر أي نص عند الحفظ')
}
async function saveDraft(){
 const s=auth();if(!s)return;const d=A.currentDraft();
 const selected=$('cloud-drafts-select').value;
 if(selected&&selected!==local.draftId)return say('افتح المسودة المحددة أولًا قبل حفظ التعديلات، أو اضغط مسودة جديدة لإنشاء عمل مستقل');
 if(!d.title.trim())return say('اكتب عنوانًا للمسودة أولًا');
 const body={title:d.title,body:d.body,category:d.category,layout:d.layout,kind:d.kind};
 if(!local.draftId){
  const {data,error}=await s.c.from('literary_drafts').insert({...body,author_id:s.u.id}).select('id').single();
  if(error)return say('تعذر إنشاء المسودة: '+error.message);
  local.draftId=data.id;
 }else{
  const {error}=await s.c.from('literary_drafts').update(body).eq('id',local.draftId).eq('author_id',s.u.id);
  if(error)return say('تعذر حفظ المسودة: '+error.message)
 }
 say('حفظت مسودتك الخاصة وأضيفت نسخة إلى سجل التعديلات');await listDrafts();loadVersions()
}
async function openDraft(){
 const s=auth();if(!s)return;
 const id=$('cloud-drafts-select').value||local.draftId;
 if(!id)return say('اختر مسودة محفوظة أولًا');
 const {data,error}=await s.c.from('literary_drafts').select('id,title,body,category,kind,layout').eq('id',id).eq('author_id',s.u.id).single();
 if(A.user()?.id!==s.u.id)return;
 if(error)return say('تعذر فتح المسودة: '+error.message);
 if(A.currentDraft().body.trim()&&!confirm('سيستبدل فتح المسودة النص الموجود في المحرر، احفظه أولًا إن لزم. هل تتابع؟'))return;
 local.draftId=id;A.setDraft(data);say('فُتحت المسودة في المحرر دون نشر');loadVersions()
}
async function loadVersions(){
 const s=auth();if(!s)return;
 const id=$('cloud-drafts-select').value||local.draftId,host=$('cloud-versions');
 if(!id)return say('اختر مسودة لعرض سجل النسخ');
 const {data,error}=await s.c.from('literary_draft_versions').select('revision,title,body,category,kind,layout,created_at').eq('draft_id',id).eq('author_id',s.u.id).order('revision',{ascending:false}).limit(30);
 if(A.user()?.id!==s.u.id)return;
 if(error){clear(host,'تعذر تحميل سجل النسخ: '+error.message);return}
 host.replaceChildren();
 for(const v of data||[]){
  const row=el('div','cloud-version-row');
  row.append(el('span','', 'النسخة '+v.revision+' — '+new Date(v.created_at).toLocaleString('ar')));
  row.append(button('استعادة إلى المحرر',()=>{
   if(!confirm('استعادة هذه النسخة إلى المحرر؟ لن تتغير المسودة المحفوظة حتى تضغط حفظ.'))return;
   A.setDraft(v);say('استعيدت النسخة إلى المحرر دون تعديل السجل. اضغط حفظ لتثبيتها.')
  }));
  host.append(row)
 }
 if(!data?.length)clear(host,'لم تُسجل نسخ سابقة')
}
async function deleteDraft(){
 const s=auth();if(!s)return;const id=$('cloud-drafts-select').value||local.draftId;
 if(!id)return say('اختر مسودة أولًا');
 if(!confirm('حذف هذه المسودة وكل نسخها المحفوظة نهائيًا؟ لن يُحذف النص المحلي أو أي قصيدة منشورة.'))return;
 const {error}=await s.c.from('literary_drafts').delete().eq('id',id).eq('author_id',s.u.id);
 if(error)return say('تعذر حذف المسودة: '+error.message);
 local.draftId=null;clear($('cloud-versions'),null);say('حذفت المسودة السحابية فقط');listDrafts()
}
$('diwan-create-form').addEventListener('submit',async e=>{
 e.preventDefault();const s=auth();if(!s)return;
 const title=$('new-diwan-title').value.trim(),description=$('new-diwan-description').value.trim();
 if(title.length<2)return say('اكتب عنوانًا للديوان');
 const {error}=await s.c.from('literary_diwans').insert({owner_id:s.u.id,title,description});
 if(error)return say('تعذر إنشاء الديوان: '+error.message);
 e.target.reset();say('أُنشئ ديوان خاص غير منشور');myDiwans()
});
$('diwan-poem-form').addEventListener('submit',async e=>{
 e.preventDefault();const s=auth();if(!s)return;
 const diwan_id=$('poem-diwan-id').value,title=$('new-poem-title').value.trim(),body=$('new-poem-body').value,category=$('new-poem-category').value.trim();
 if(!diwan_id||!local.diwans.some(d=>d.id===diwan_id))return say('اختر ديوانًا تملكه');
 if(title.length<2||body.trim().length<10)return say('أدخل عنوانًا ونصًا كاملًا');
 const {error}=await s.c.from('diwan_poems').insert({diwan_id,author_id:s.u.id,title,body,category});
 if(error)return say('تعذر حفظ القصيدة: '+error.message);
 e.target.reset();say('حُفظت القصيدة كمسودة خاصة في ديوانك، دون نشر');myDiwans()
});
$('import-editor-diwan').addEventListener('click',()=>{
 const d=A.currentDraft();$('new-poem-title').value=d.title;$('new-poem-body').value=d.body;$('new-poem-category').value=d.category;
 say('نُقل النص إلى نموذج الديوان دون نشر. اختر الديوان واضغط حفظ المسودة.')
});
$('cloud-save').addEventListener('click',saveDraft);
$('cloud-new').addEventListener('click',()=>{
 if(A.currentDraft().body.trim()&&!confirm('بدء مسودة فارغة؟ احفظ النص الحالي أولًا إذا أردت الاحتفاظ به.'))return;
 local.draftId=null;$('cloud-drafts-select').value='';clear($('cloud-versions'),null);
 A.setDraft({title:'',body:'',kind:'poem',layout:'free',category:''});say('مسودة جديدة في المحرر، لم تحفظ على السحابة')
});
$('cloud-drafts-select').addEventListener('change',()=>{clear($('cloud-versions'),null)});
$('cloud-open').addEventListener('click',openDraft);
$('cloud-history').addEventListener('click',loadVersions);
$('cloud-delete').addEventListener('click',deleteDraft);
$('community-refresh').addEventListener('click',()=>A.loadFeed());
$('community-filter').addEventListener('change',()=>A.loadFeed());
const originalSession=()=>{const id=A.user()?.id||null;if(local.activeUserId!==id){
 local.activeUserId=id;local.draftId=null;clear($('cloud-versions'),null)
}
 if(A.client()){publicDiwans();listDrafts()}
};
let tick;window.addEventListener('alameri:session',()=>{clearTimeout(tick);tick=setTimeout(originalSession,180)});
window.addEventListener('alameri:section',e=>{
 if(e.detail.id==='diwans'){publicDiwans();if(A.user())myDiwans();else clear($('diwan-owner-list'),'سجّل الدخول لإنشاء دواوينك الخاصة')}
 if(e.detail.id==='literary-review')reviewQueue();
 if(e.detail.id==='editor')listDrafts();
});
originalSession();
})();
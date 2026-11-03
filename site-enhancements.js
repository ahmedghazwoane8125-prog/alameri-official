/* AL-AMERI homepage improvements. Non-destructive, progressively enhanced. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const make=(tag,cl,txt)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e};
const openStudio='studio/';
const banner=make('div','studio-banner'),info=make('div'),title=make('h3','','استوديو الشعر والكتابة'),sub=make('p','','محرر عربي، تشكيل مساعد، ألوان وخطوط للقراءة، مسودات خاصة، ومساحة للأعضاء والشعراء.'),cta=make('a','btn primary','افتح الاستوديو الأدبي');
cta.href=openStudio;info.append(title,sub);banner.append(info,cta);
const poetry=$('poems-note')?.parentNode;
if(poetry)poetry.append(banner);
const bookList=$('books-list');
if(bookList){
 const wrapper=make('div','pub-list'),h=make('h3','','القصائد المنشورة إلكترونيا'),p=make('p','','هذه صفحات قصائد منشورة على الموقع، وليست ديوانا مطبوعا معتمدا بعد.'),grid=make('div','pub-grid');
 wrapper.append(h,p,grid);bookList.append(wrapper);
 fetch('poems.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{
  const poems=Array.isArray(d.poems)?d.poems:[];
  for(const poem of poems){
   if(!poem?.id||!poem?.title)continue;
   const a=make('a','pub-card'),strong=make('strong','',poem.title),span=make('span','',poem.category||'نص شعري');
   a.href='poems/'+encodeURIComponent(poem.id)+'.html';a.append(strong,span);grid.append(a)
  }
 }).catch(()=>{p.textContent='تتوفر القصائد المنشورة من فهرس الديوان الشعري أعلاه.'});
}
const dialog=$('poem-dialog'),dialogBody=$('dialog-poem-body');
if(dialog&&dialogBody){
 const row=make('div','extra-reader-controls');
 const label=make('span','','خيارات القراءة');
 label.style.color='var(--muted)';label.style.fontSize='11px';row.append(label);
 const paper=make('select'),colors=make('select'),font=make('select');
 for(const [v,l]of [['none','افتراضي'],['cream','ورقي'],['white','أبيض'],['night','ليلي']]){const o=make('option','',l);o.value=v;paper.append(o)}
 paper.title='خلفية القراءة';
 for(const [v,l]of [['default','لون عادي'],['blue','حبر أزرق'],['gold','حبر ذهبي']]){const o=make('option','',l);o.value=v;colors.append(o)}
 colors.title='لون النص';
 for(const [v,l]of [['amiri','أميري'],['cairo','القاهرة']]){const o=make('option','',l);o.value=v;font.append(o)}
 font.title='نوع الخط';
 paper.addEventListener('change',()=>{
  dialogBody.classList.remove('reader-paper-cream','reader-paper-white','reader-paper-night');
  if(paper.value!=='none')dialogBody.classList.add('reader-paper-'+paper.value)
 });
 colors.addEventListener('change',()=>{dialogBody.classList.remove('reader-text-blue','reader-text-gold');if(colors.value!=='default')dialogBody.classList.add('reader-text-'+colors.value)});
 font.addEventListener('change',()=>{
  dialogBody.style.fontFamily=font.value==='cairo'?"'Cairo',sans-serif":"'Amiri',serif";
  dialogBody.querySelectorAll('.poem-verses,.poem-free-verse').forEach(n=>n.style.fontFamily=font.value==='cairo'?"'Cairo',sans-serif":"'Amiri',serif")
 });
 const q=make('button','','اقتباس المحدد');q.type='button';q.addEventListener('click',async()=>{
  const t=window.getSelection()?.toString().trim();
  if(!t){alert('حدد بيتا أو عبارة من القصيدة أولا');return}
  const value='«'+t+'»\n— '+($('dialog-poem-title')?.textContent||'قصيدة');
  try{await navigator.clipboard.writeText(value);alert('تم نسخ الاقتباس')}catch(e){alert('تعذر نسخ الاقتباس')}
 });
 row.append(paper,colors,font,q);dialog.querySelector('.dialog-actions')?.after(row);
}
const dock=make('nav','mobile-site-dock');dock.setAttribute('aria-label','التنقل السريع على الهاتف');
for(const [href,symbol,label] of [['#الرئيسية','⌂','الرئيسية'],['#الديوان','▤','الديوان'],['studio/#editor','✎','اكتب'],['studio/#account','♙','حسابي']]){
 const a=make('a',''),icon=make('b','',symbol),text=make('span','',label);a.href=href;a.append(icon,text);dock.append(a)
}document.body.append(dock);
})();
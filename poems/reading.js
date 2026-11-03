(()=>{'use strict';
const article=document.querySelector('main article');if(!article)return;
const texts=[...article.querySelectorAll('.verse-text')];if(!texts.length)return;
const make=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
const strip=(s)=>String(s||'').trim();
let size=23;
const toolbar=make('div');toolbar.className='reader-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','خيارات قراءة القصيدة');
const addBtn=(txt,fn)=>{const b=make('button',txt);b.type='button';b.addEventListener('click',fn);toolbar.append(b);return b};
addBtn('أ−',()=>setSize(size-2));addBtn('أ+',()=>setSize(size+2));
const sizeLabel=make('span','23');sizeLabel.className='reader-size-label';toolbar.append(sizeLabel);
const backgrounds=['reader-cream','reader-white','reader-night'];let bi=-1;
addBtn('الخلفية',()=>{document.body.classList.remove(...backgrounds);bi=(bi+1)%4;if(bi<3)document.body.classList.add(backgrounds[bi])});
const ink=make('select');ink.title='لون النص';for(const [v,t]of [['normal','حبر عادي'],['reader-blue','أزرق'],['reader-gold','ذهبي']]){const o=make('option',t);o.value=v;ink.append(o)}
ink.addEventListener('change',()=>{document.body.classList.remove('reader-blue','reader-gold');if(ink.value!=='normal')document.body.classList.add(ink.value)});toolbar.append(ink);
addBtn('تغيير الخط',()=>document.body.classList.toggle('reader-cairo'));
addBtn('محاذاة',()=>document.body.classList.toggle('reader-center'));
const poemTitle=strip(document.querySelector('article h1')?.textContent)||document.title;
const joined=()=>[poemTitle,...[...article.querySelectorAll('.verse-section')].map(s=>{const a=strip(s.querySelector('.byline')?.textContent),h=strip(s.querySelector('h2')?.textContent),t=strip(s.querySelector('.verse-text')?.textContent);return [h,a,t].filter(Boolean).join('\n')})].filter(Boolean).join('\n\n') || [poemTitle,...texts.map(t=>t.textContent)].join('\n\n');
async function copy(s){try{await navigator.clipboard.writeText(s);alert('تم نسخ النص')}catch(e){alert('تعذر النسخ من هذا المتصفح')}}
addBtn('نسخ',()=>copy(joined()));
addBtn('اقتباس',()=>{const selected=strip(window.getSelection()?.toString());if(!selected)return alert('حدد بيتا أو عبارة من القصيدة أولا');copy('«'+selected+'»\n— '+poemTitle)});
addBtn('مشاركة',async()=>{if(navigator.share){try{await navigator.share({title:poemTitle,url:location.href});return}catch(e){if(e.name==='AbortError')return}}await copy(location.href)});
const link=make('a','✎ استوديو الكتابة');link.className='reader-link';link.href='../studio/#editor';toolbar.append(link);
const anchor=article.querySelector('.verse-section')||texts[0];anchor.before(toolbar);
function setSize(n){size=Math.max(16,Math.min(37,n));sizeLabel.textContent=size;for(const node of texts){node.style.fontSize=size+'px'}}
})();
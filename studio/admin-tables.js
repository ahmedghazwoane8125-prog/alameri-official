/* AL-AMERI read-only admin grids, TanStack Table Core 8.21.3 (pinned).
   Uses only existing RLS-authorized Supabase reads. No role updates or publication writes. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const root=byId('admin-tables');
if(!root)return;
const views={
 poems:{columns:[
  {accessorKey:'title',header:'عنوان العمل'},
  {accessorKey:'author',header:'الشاعر'},
  {accessorKey:'category',header:'التصنيف'},
  {accessorKey:'source',header:'المصدر'},
  {accessorKey:'status',header:'الحالة',filterFn:'equalsString'},
  {accessorKey:'created_at',header:'التاريخ'},
  {id:'action',header:'معاينة',enableSorting:false,enableHiding:false,enableGlobalFilter:false}
 ],filter:'status'},
 members:{columns:[
  {accessorKey:'display_name',header:'الاسم'},
  {accessorKey:'pen_name',header:'الاسم الأدبي'},
  {accessorKey:'role',header:'الصفة',filterFn:'equalsString'},
  {accessorKey:'created_at',header:'تاريخ الانضمام'}
 ],filter:'role'}
};
const translation={member:'عضو',poet:'شاعر',verified_poet:'شاعر موثق',reviewer:'مراجع',admin:'مدير',
 published:'منشور',submitted:'بانتظار الاعتماد',draft:'مسودة',archived:'مؤرشف',rejected:'أعيد للمراجعة'};
const PAGE_LIMIT=500;
let engine=null,active='poems',serial=0,previewSerial=0,rows={poems:[],members:[]},tables={},
 totals={poems:0,members:0},notices={poems:'',members:''};
const api=()=>window.ALAMERI_STUDIO;
const authorized=()=>Boolean(api()?.client()&&api()?.user()&&api()?.role()==='admin');
const element=(tag,className,label)=>{
 const e=document.createElement(tag);if(className)e.className=className;
 if(label!==undefined)e.textContent=String(label??'');return e;
};
const say=msg=>{byId('admin-table-status').textContent=msg};
const date=value=>{
 if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('ar-YE',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
};
const value=v=>String(v??'').trim()||'—';
function clearForGuest(){
 serial++;previewSerial++;rows={poems:[],members:[]};tables={};totals={poems:0,members:0};
 byId('admin-grid-head').replaceChildren();byId('admin-grid-body').replaceChildren();
 byId('admin-column-choices').replaceChildren();
 byId('admin-table-search').value='';byId('admin-table-filter').replaceChildren();
 byId('admin-table-count').textContent='—';
 const dialog=byId('admin-poem-preview');if(dialog.open)dialog.close();
 say('هذه الجداول متاحة للمدير المسجل فقط.');
}
function configureTable(kind){
 const original=rows[kind];let tableState={};
 let table;
 table=engine.createTable({
  data:original,columns:views[kind].columns,getRowId:row=>row.key,
  getCoreRowModel:engine.getCoreRowModel(),getFilteredRowModel:engine.getFilteredRowModel(),
  getSortedRowModel:engine.getSortedRowModel(),getPaginationRowModel:engine.getPaginationRowModel(),
  globalFilterFn:(row,_id,search)=>[row.original.title,row.original.display_name,row.original.pen_name,
    row.original.author,row.original.category,row.original.source,row.original.status,
    row.original.role,row.original.created_at].some(x=>String(x??'').toLocaleLowerCase('ar').includes(String(search).toLocaleLowerCase('ar'))),
  state:{},
  onStateChange:updater=>{
   tableState=typeof updater==='function'?updater(tableState):updater;
   table.setOptions(old=>({...old,state:tableState}));
   if(authorized()&&active===kind)render();
  }
 });
 tableState={...table.initialState,
  sorting:[{id:'created_at',desc:true}],globalFilter:'',
  columnFilters:[],columnVisibility:{},pagination:{pageIndex:0,pageSize:10}};
 table.setOptions(old=>({...old,state:tableState}));
 tables[kind]=table;
}
function filterChoices(){
 const select=byId('admin-table-filter'),table=tables[active];select.replaceChildren();
 const options=new Set(rows[active].map(r=>r[views[active].filter]).filter(Boolean));
 const first=element('option','','جميع '+(active==='poems'?'الحالات':'الصفات'));first.value='';select.append(first);
 for(const v of Array.from(options).sort((a,b)=>a.localeCompare(b,'ar'))){
  const o=element('option','',translation[v]||v);o.value=v;select.append(o);
 }
 const current=table.getState().columnFilters.find(x=>x.id===views[active].filter);
 select.value=current?.value||'';
}
function visibilityChoices(){
 const table=tables[active],host=byId('admin-column-choices');host.replaceChildren();
 for(const c of table.getAllLeafColumns().filter(x=>x.getCanHide())){
  const label=element('label','admin-column-choice');
  const input=element('input');input.type='checkbox';input.checked=c.getIsVisible();
  input.addEventListener('change',()=>c.toggleVisibility(input.checked));
  label.append(input,element('span','',c.columnDef.header));host.append(label);
 }
}
function render(){
 if(!authorized())return clearForGuest();
 const table=tables[active];if(!table)return;
 const thead=byId('admin-grid-head'),tbody=byId('admin-grid-body');thead.replaceChildren();tbody.replaceChildren();
 const head=element('tr');
 const columns=table.getVisibleLeafColumns();
 for(const c of columns){
  const th=element('th');th.scope='col';
  if(c.getCanSort()){
   const btn=element('button','admin-sort',c.columnDef.header);
   const sorted=c.getIsSorted();btn.append(element('span','',sorted==='asc'?' ↑':sorted==='desc'?' ↓':' ↕'));
   btn.type='button';btn.setAttribute('aria-label','ترتيب حسب '+c.columnDef.header);
   btn.addEventListener('click',()=>c.toggleSorting());th.append(btn);
   th.setAttribute('aria-sort',sorted==='asc'?'ascending':sorted==='desc'?'descending':'none');
  }else th.textContent=c.columnDef.header;
  head.append(th);
 }
 thead.append(head);
 const visibleRows=table.getRowModel().rows;
 for(const r of visibleRows){
  const tr=element('tr');
  for(const c of columns){
   const td=element('td');
   if(c.id==='action'){
    const btn=element('button','admin-view-poem','قراءة');
    btn.type='button';btn.addEventListener('click',()=>previewPoem(r.original));td.append(btn);
   }else if(c.id==='role'||c.id==='status'){
    td.append(element('span','admin-state',translation[r.getValue(c.id)]||value(r.getValue(c.id))));
   }else td.textContent=value(r.getValue(c.id));
   tr.append(td);
  }
  tbody.append(tr);
 }
 if(!visibleRows.length){
  const tr=element('tr'),td=element('td','admin-grid-empty','لا توجد سجلات مطابقة ضمن البيانات المتاحة');
  td.colSpan=columns.length||1;tr.append(td);tbody.append(tr);
 }
 const filtered=table.getFilteredRowModel().rows.length;
 const current=table.getState().pagination.pageIndex+1;
 byId('admin-table-count').textContent='عرض '+visibleRows.length+' من '+filtered+' سجل • صفحة '+current+' من '+Math.max(1,table.getPageCount());
 byId('admin-page-prev').disabled=!table.getCanPreviousPage();
 byId('admin-page-next').disabled=!table.getCanNextPage();
 const note=notices[active]||'';
 say('النتائج وفق صلاحيات الحساب الحالي'+(note?' — '+note:''));
}
function activate(kind){
 active=kind;
 for(const b of root.querySelectorAll('[data-admin-tab]')){
  const selected=b.dataset.adminTab===kind;b.setAttribute('aria-selected',String(selected));
  b.tabIndex=selected?0:-1;
 }
 if(!tables[kind])return;
 byId('admin-table-search').value=tables[kind].getState().globalFilter||'';
 byId('admin-table-pagesize').value=String(tables[kind].getState().pagination.pageSize);
 filterChoices();visibilityChoices();render();
}
async function previewPoem(item){
 if(!authorized())return;
 const token=++previewSerial;const dialog=byId('admin-poem-preview');
 byId('admin-poem-title').textContent=item.title;
 byId('admin-poem-body').textContent='جار تحميل النص…';
 if(!dialog.open)dialog.showModal();
 try{
  let text;
  if(item.origin==='original')text=item.body;
  else{
   const table=item.origin==='diwan'?'diwan_poems':'posts';
   const {data,error}=await api().client().from(table).select('body').eq('id',item.originId).single();
   if(error)throw error;text=data?.body||'';
  }
  if(token!==previewSerial||!authorized()||!dialog.open)return;
  byId('admin-poem-body').textContent=text||'لا يوجد نص متاح';
 }catch(e){
  if(token===previewSerial&&dialog.open&&authorized())
   byId('admin-poem-body').textContent='تعذر جلب النص وفق الصلاحيات الحالية: '+(e?.message||'خطأ');
 }
}
async function fetchRows(){
 if(!authorized())return clearForGuest();
 const token=++serial,client=api().client();
 say('جار قراءة سجلات القصائد والأعضاء المسموح بها…');
 byId('admin-table-refresh').disabled=true;
 try{
  const [profiles,diwan,posts,staticResponse]=await Promise.all([
   client.from('profiles').select('id,display_name,pen_name,role,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(PAGE_LIMIT),
   client.from('diwan_poems').select('id,title,author_id,category,status,created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(PAGE_LIMIT),
   client.from('posts').select('id,title,author_id,category,publication_status,created_at',{count:'exact'}).eq('kind','poem').order('created_at',{ascending:false}).limit(PAGE_LIMIT),
   fetch('../poems.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).catch(error=>({error:String(error)}))
  ]);
  if(token!==serial||!authorized())return;
  const errors=[['الأعضاء',profiles.error],['قصائد الدواوين',diwan.error],['قصائد المنشورات',posts.error]].filter(x=>x[1]);
  if(errors.length)throw Error(errors.map(x=>x[0]+': '+x[1].message).join(' | '));
  const byUser=new Map((profiles.data||[]).map(p=>[p.id,p.pen_name||p.display_name]));
  const library=Array.isArray(staticResponse?.poems)?staticResponse.poems.filter(p=>p?.id&&p?.title&&typeof p.text==='string'):[];
  const combined=[
   ...library.map(p=>({key:'static-'+p.id,origin:'original',originId:p.id,title:p.title,
     body:p.text,author:'عبد الحفيظ بن منصور العامري',category:p.category||'',status:'published',
     source:'المكتبة الأصلية',created_at:p.date||''})),
   ...(diwan.data||[]).map(p=>({key:'diwan-'+p.id,origin:'diwan',originId:p.id,title:p.title,
     author:byUser.get(p.author_id)||'كاتب',category:p.category||'',status:p.status,
     source:'قصائد الدواوين',created_at:p.created_at})),
   ...(posts.data||[]).map(p=>({key:'post-'+p.id,origin:'post',originId:p.id,title:p.title,
     author:byUser.get(p.author_id)||'كاتب',category:p.category||'',status:p.publication_status,
     source:'مشاركات شعرية',created_at:p.created_at}))
  ];
  rows.poems=combined;
  rows.members=(profiles.data||[]).map(p=>({key:p.id,display_name:p.display_name||'',pen_name:p.pen_name||'',
    role:p.role,created_at:p.created_at}));
  totals.poems=library.length+(diwan.count??diwan.data?.length??0)+(posts.count??posts.data?.length??0);
  totals.members=profiles.count??profiles.data?.length??0;
  notices.poems=[
   staticResponse.error?'تعذر تحميل فهرس القصائد الأصلية':'',
   diwan.count>PAGE_LIMIT||posts.count>PAGE_LIMIT?'عرض أول '+PAGE_LIMIT+' سجل من كل مصدر فقط':'',
   'مسودات منشورات الآخرين غير متاحة وفق RLS'
  ].filter(Boolean).join(' • ');
  notices.members=profiles.count>PAGE_LIMIT?'عرض أول '+PAGE_LIMIT+' عضو فقط':'';
  configureTable('poems');configureTable('members');activate(active);
 }catch(e){
  if(token!==serial||!authorized())return;
  tables={};byId('admin-grid-body').replaceChildren();
  byId('admin-grid-head').replaceChildren();
  say('تعذر تحميل الجداول: '+(e?.message||'خطأ غير معروف'));
 }finally{if(token===serial)byId('admin-table-refresh').disabled=false}
}
async function load(){
 if(!authorized())return clearForGuest();
 if(!engine){
  say('جار تحميل محرك الجداول…');
  try{
   engine=await import('https://cdn.jsdelivr.net/npm/@tanstack/table-core@8.21.3/+esm');
  }catch(e){say('تعذر تحميل TanStack Table؛ تحقق من الاتصال بالإنترنت أو حجب شبكة CDN.');return}
 }
 if(authorized())await fetchRows();
}
byId('admin-table-refresh').addEventListener('click',load);
root.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.adminTab)));
byId('admin-table-search').addEventListener('input',e=>{
 const table=tables[active];if(!table)return;table.setPageIndex(0);table.setGlobalFilter(e.target.value);
});
byId('admin-table-filter').addEventListener('change',e=>{
 const table=tables[active];if(!table)return;table.setPageIndex(0);
 table.setColumnFilters(e.target.value?[{id:views[active].filter,value:e.target.value}]:[]);
});
byId('admin-table-pagesize').addEventListener('change',e=>tables[active]?.setPageSize(Number(e.target.value)));
byId('admin-page-prev').addEventListener('click',()=>tables[active]?.previousPage());
byId('admin-page-next').addEventListener('click',()=>tables[active]?.nextPage());
byId('admin-poem-close').addEventListener('click',()=>byId('admin-poem-preview').close());
byId('admin-poem-preview').addEventListener('close',()=>{previewSerial++});
window.addEventListener('alameri:section',event=>{
 if(event.detail?.id==='dashboard')load();else previewSerial++;
});
window.addEventListener('alameri:session',()=>{
 if(!authorized())clearForGuest();
 else if(!byId('dashboard').hidden)load();
});
if(!byId('dashboard').hidden)load();
})();

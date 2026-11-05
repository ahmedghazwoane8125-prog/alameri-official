/* Browser-test-only Supabase simulator. No request ever reaches a real project. */
(()=>{'use strict';
const mode=new URLSearchParams(location.search).get('mock')||'guest';
const userId='11111111-1111-4111-8111-111111111111';
const profile={id:userId,display_name:'عضو الاختبار',pen_name:'',bio:'',country:'',city:'',website:'',role:['member','poet','reviewer','admin'].includes(mode)?mode:'member'};
const db={
  profiles:[profile],
  private_contacts:[{user_id:userId,whatsapp:'+967700000001',whatsapp_visibility:'private'}],
  poet_applications:[],posts:[],post_likes:[],bookmarks:[],comments:[],follows:[],
  literary_diwans:[],diwan_poems:[],literary_drafts:[],literary_draft_versions:[],
  literary_review_log:[],review_log:[]
};
const writes=[],rpcCalls=[];
const makeUser=()=>({id:userId,email:'sandbox@example.invalid'});
let currentUser=mode==='guest'?null:makeUser();
const callbacks=[];
let serial=0;

class Query{
  constructor(name){this.name=name;this.operation='select';this.filters=[];this.limitN=Infinity;this.payload=null}
  select(){return this}
  eq(key,value){this.filters.push(row=>row[key]===value);return this}
  in(key,values){this.filters.push(row=>values.includes(row[key]));return this}
  order(){return this}
  limit(n){this.limitN=n;return this}
  insert(value){this.operation='insert';this.payload=value;return this}
  update(value){this.operation='update';this.payload=value;return this}
  delete(){this.operation='delete';return this}
  single(){return this.run('single')}
  maybeSingle(){return this.run('maybeSingle')}
  then(resolve,reject){return this.run().then(resolve,reject)}
  async run(cardinality){
    const rows=db[this.name];
    if(!rows)return {data:null,error:{message:'Unknown mocked table: '+this.name}};
    let selected=rows.filter(row=>this.filters.every(fn=>fn(row)));
    if(this.operation==='insert'){
      const incoming=Array.isArray(this.payload)?this.payload:[this.payload];
      selected=incoming.map(row=>({...row,id:row.id||'test-id-'+(++serial),revision:row.revision||1,status:row.status||'draft',created_at:row.created_at||new Date().toISOString(),updated_at:new Date().toISOString()}));
      rows.push(...selected);
      writes.push({table:this.name,operation:'insert',items:selected.map(x=>({...x}))});
    }else if(this.operation==='update'){
      selected.forEach(row=>Object.assign(row,this.payload));
      if(selected.length)writes.push({table:this.name,operation:'update',items:selected.map(x=>({...x}))});
    }else if(this.operation==='delete'){
      selected.forEach(row=>{const i=rows.indexOf(row);if(i>=0)rows.splice(i,1)});
      if(selected.length)writes.push({table:this.name,operation:'delete',items:selected.map(x=>({...x}))});
    }
    selected=selected.slice(0,this.limitN).map(row=>({...row}));
    if(cardinality==='single'){
      return {data:selected[0]||null,error:selected[0]?null:{message:'No row found'}};
    }
    if(cardinality==='maybeSingle')return {data:selected[0]||null,error:null};
    return {data:selected,error:null};
  }
}

const emit=(event)=>callbacks.forEach(cb=>cb(event,currentUser?{user:currentUser}:null));
const client={
  auth:{
    async getUser(){return {data:{user:currentUser},error:null}},
    onAuthStateChange(callback){callbacks.push(callback);return {data:{subscription:{unsubscribe(){}}}}},
    async signInWithPassword({email,password}){
      if(password==='bad-password')return {data:null,error:{message:'Wrong test password'}};
      currentUser=makeUser();profile.role='member';emit('SIGNED_IN');
      return {data:{user:currentUser,session:{user:currentUser}},error:null};
    },
    async signOut(){currentUser=null;emit('SIGNED_OUT');return {error:null}},
    async signUp(){return {data:{user:makeUser(),session:null},error:null}},
    async signInWithOtp(){return {error:null}},
    async resend(){return {error:null}},
    async verifyOtp(){currentUser=makeUser();emit('SIGNED_IN');return {data:{user:currentUser,session:{user:currentUser}},error:null}},
    async updateUser(){return {error:null}},
    async resetPasswordForEmail(){return {error:null}}
  },
  from(name){return new Query(name)},
  async rpc(fn,args){
    rpcCalls.push({name:fn,args});
    if(fn==='literary_action'&&args?.p_action==='approve'&&profile.role!=='admin'){
      return {data:null,error:{message:'Not authorized'}};
    }
    return {data:args?.p_action||null,error:null};
  }
};
window.__sandbox={db,writes,rpcCalls,client,getUser:()=>currentUser,setRole(role){profile.role=role;emit('SIGNED_IN')}};
window.supabase={createClient:()=>client};
})();
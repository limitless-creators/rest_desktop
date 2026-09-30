
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function snapshot(db,owner,tables,encode){
 const data={};
 for(const t of [...Object.keys(tables),"attachments"]){
  data[t]=db.prepare("SELECT * FROM "+t+" WHERE user_id=? ORDER BY id").all(owner).map(row=>t==="attachments"?{...row,data:encode(row.data)}:row);
 }
 return data;
}
function validate(data,owner,tables){
 const names=[...Object.keys(tables),"attachments"];
 if(!data||typeof data!=="object"||Object.keys(data).length!==names.length)throw Error("Conjunto de dados incompatível.");
 for(const t of names){
  if(!Array.isArray(data[t])||data[t].length>100000)throw Error("Tabela inválida: "+t);
  const ids=new Set();
  for(const r of data[t]){
   if(!r||typeof r.id!=="string"||r.id.length>100||r.user_id!==owner||ids.has(r.id))throw Error("Registo inválido: "+t);
   ids.add(r.id);
  }
 }
}
function merge(base,local,remote){
 const result={},conflicts=[];
 for(const t of Object.keys(remote)){
  const b=new Map(base[t].map(r=>[r.id,r])),l=new Map(local[t].map(r=>[r.id,r])),r=new Map(remote[t].map(r=>[r.id,r]));
  result[t]=[];
  for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){
   const before=b.get(id),phone=l.get(id),pc=r.get(id);
   const changedPhone=stable(before)!==stable(phone),changedPC=stable(before)!==stable(pc);
   if(changedPhone&&changedPC&&stable(phone)!==stable(pc))conflicts.push({table:t,id});
   const chosen=changedPhone?phone:pc;
   if(chosen)result[t].push(chosen);
  }
  result[t].sort((a,b)=>a.id.localeCompare(b.id));
 }
 if(conflicts.length){const e=Error("Alterações incompatíveis nos dois dispositivos ("+conflicts.length+"). Nenhum dado foi substituído. Reveja os registos no PC.");e.conflicts=conflicts;throw e;}
 return result;
}
function replace(db,owner,tables,data,decode){
 validate(data,owner,tables);
 const names=[...Object.keys(tables),"attachments"];
 db.exec("PRAGMA defer_foreign_keys=ON");
 for(const t of [...names].reverse())db.prepare("DELETE FROM "+t+" WHERE user_id=?").run(owner);
 for(const t of names){
  const columns=new Set(db.prepare("PRAGMA table_info("+t+")").all().map(c=>c.name));
  for(const row of data[t]){
   const keys=Object.keys(row);
   if(keys.some(k=>!columns.has(k)))throw Error("Campo não reconhecido: "+t);
   const values=keys.map(k=>t==="attachments"&&k==="data"?decode(row[k]):row[k]);
   db.prepare("INSERT INTO "+t+"("+keys.join(",")+") VALUES("+keys.map(()=>"?").join(",")+")").run(...values);
  }
 }
 if(db.prepare("PRAGMA foreign_key_check").all().length)throw Error("Referências de dados incompatíveis. Nenhum dado foi substituído.");
}
function countChanges(base,local){
 let count=0;
 for(const t of Object.keys(local)){const a=new Map((base?.[t]||[]).map(r=>[r.id,stable(r)])),b=new Map(local[t].map(r=>[r.id,stable(r)]));for(const id of new Set([...a.keys(),...b.keys()]))if(a.get(id)!==b.get(id))count++;}
 return count;
}
module.exports={stable,snapshot,validate,merge,replace,countChanges};

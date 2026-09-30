const kinds=['invoices','quotes','receipts','expenses','general_sales'];
function reconnectLimits(service,payload,grants,history){
 if(payload.ownerId!==service.owner())throw Error('Este QR pertence a outra conta. Abra no Windows a mesma conta deste celular.');
 const prior=history.devices?.[service.owner()]?.[payload.deviceId],existing=grants[payload.deviceId];
 if(!prior&&existing?.userId!==service.owner())throw Error('Este Windows não conhece o emparelhamento anterior deste celular.');
 const known=existing?.userId===service.owner()?existing.limits:prior?.limits;
 const result={};
 for(const kind of kinds){
  const range=payload.limits?.[kind],reserved=service.db.prepare('SELECT value FROM counters WHERE user_id=? AND kind=?').get(service.owner(),kind)?.value||0;
  if(!range||!Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||range.start<1||range.end-range.start!==999||range.end>reserved)throw Error('Não foi possível validar a numeração anterior. Os dados do celular foram preservados.');
  if(known?.[kind]&&(known[kind].start!==range.start||known[kind].end!==range.end))throw Error('O intervalo de numeração não corresponde a este celular.');
  for(const [id,g] of Object.entries(grants)){
   const other=g.limits?.[kind];if(id!==payload.deviceId&&g.userId===service.owner()&&other&&range.start<=other.end&&range.end>=other.start)throw Error('A numeração coincide com outro celular autorizado.');
  }
  result[kind]={start:range.start,end:range.end};
 }
 return result;
}
module.exports={reconnectLimits};

// Complete snapshots only: a failed later page must not replace the offline
// catalog with a partial first page. No timers or per-keystroke database reads.
export async function downloadCatalog(request,{moderationOffset=0,isCurrent=()=>true}={}){
  const first=await request(`/api/foods?offset=0&moderationOffset=${moderationOffset}`);
  if(!Array.isArray(first.publicFoods))throw Error('Resposta inválida do catálogo.');
  const rows=[...first.publicFoods],seen=new Set([0]);
  let next=first.nextOffset;
  while(next!==null){
    if(!isCurrent())throw Error('Atualização do catálogo cancelada.');
    if(!Number.isSafeInteger(next)||next<=0||seen.has(next)||seen.size>=1000)throw Error('Não foi possível baixar o catálogo completo. Tente atualizar novamente.');
    seen.add(next);
    const page=await request(`/api/foods?offset=${next}&publicOnly=1`);
    if(!Array.isArray(page.publicFoods))throw Error('Resposta inválida do catálogo.');
    rows.push(...page.publicFoods);next=page.nextOffset;
  }
  if(!isCurrent())throw Error('Atualização do catálogo cancelada.');
  return {...first,publicFoods:[...new Map(rows.map(row=>[row.id,row])).values()],nextOffset:null};
}

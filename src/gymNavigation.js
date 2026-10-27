export const gymRoute = view => view === 'settings' ? '#/treinos/plano' : ['A','B'].includes(view) ? `#/treinos/sessao/${view}` : '#/treinos';
export function gymView(hash,hasPlan){
  if(hash==='#/treinos/plano')return 'settings';
  const template=hash.match(/^#\/treinos\/sessao\/([AB])$/)?.[1];
  return template?(hasPlan?template:'settings'):'overview';
}

import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const parse=text=>Object.fromEntries(text.split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
const moderator=parse(await readFile('.env.foods-moderator.local','utf8'));
const environments={};
for(const target of ['preview','development'])environments[target]=parse(await readFile(`.env.foods-${target}.local`,'utf8'));
let local=await readFile('.env.local','utf8');
for(const [name,value] of Object.entries({...environments.development,...moderator})){
  local=local.replace(new RegExp(`^${name}=.*(?:\\r?\\n|$)`,'gm'),'');
  local+=`\n${name}=${value}\n`;
}
await writeFile('.env.local',local);
if(process.argv.includes('--push')) {
  const additions=[...Object.entries(environments).flatMap(([target,values])=>Object.entries(values).map(([name,value])=>({target,name,value}))),...['production','preview','development'].map(target=>({target,name:'FOOD_MODERATOR_IDS',value:moderator.FOOD_MODERATOR_IDS}))];
  for(const {name,target,value} of additions){
    if(!value)throw new Error(`Valor ausente para ${name}.`);
    const command=`vercel env add ${name} ${target} --scope rarysonrosts-projects --force --yes${target==='development'?'':' --sensitive'}`;
    await new Promise((resolve,reject)=>{
      const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c',command],{windowsHide:true,stdio:['pipe','pipe','pipe']});
      let output='';child.stdout.on('data',()=>{});child.stderr.on('data',chunk=>{output+=chunk;});
      child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Falha ao configurar ${name} em ${target}: ${output.replaceAll(value,'[redacted]').slice(-600)}`)));
      child.stdin.end(value);
    });
    console.log(`${name} configurada em ${target}; valor não exibido.`);
  }
}
console.log('Configuração local isolada pronta. Variáveis de produção do Clerk e do banco original preservadas.');

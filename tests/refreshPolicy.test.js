import test from 'node:test';
import assert from 'node:assert/strict';
import {createRefreshGate,AUTO_REFRESH_COOLDOWN} from '../src/refreshPolicy.js';

test('leituras automáticas não mantêm o banco ativo por foco repetido ou aba escondida',()=>{
  let time=0;const gate=createRefreshGate(()=>time);
  assert.equal(gate.allow({automatic:true}),true);
  for(let minute=1;minute<10;minute++){
    time=minute*60000;
    assert.equal(gate.allow({automatic:true}),false);
  }
  time=AUTO_REFRESH_COOLDOWN;
  assert.equal(gate.allow({automatic:true,visible:false}),false);
  assert.equal(gate.allow({automatic:true,online:false}),false);
  assert.equal(gate.allow({automatic:true}),true);
});

test('edições pendentes enviam imediatamente, atualização manual funciona e falhas não geram tempestade de foco',()=>{
  let time=100;const gate=createRefreshGate(()=>time);
  assert.equal(gate.allow({automatic:true}),true);
  assert.equal(gate.allow({automatic:true,dirty:true,visible:false}),true);
  assert.equal(gate.allow({automatic:true,dirty:true,online:false}),false);
  assert.equal(gate.allow(),true);
  time+=1;
  assert.equal(gate.allow({automatic:true}),false);
});

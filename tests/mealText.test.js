import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMealText, reviewedItems, resolveGrams } from '../src/mealText.js';
import { createDictation, speechText } from '../src/speech.js';

test('interpreta português com números por extenso e várias comidas', () => {
  const parsed = parseMealText('No almoço comi cento e cinquenta gramas de arroz branco e cem gramas de feijão preto.');
  assert.equal(parsed.meal, 'Almoço');
  assert.deepEqual(parsed.rows.map(r => [r.foodId, r.grams]), [['taco-3', 150], ['taco-567', 100]]);
  assert.equal(reviewedItems(parsed.rows).reduce((sum, i) => sum + i.calories, 0), 269);
});
test('converte kg com vírgula e não inventa gramas para unidades', () => {
  const parsed = parseMealText('No jantar, 0,15 kg de arroz integral e duas coxas de frango assadas');
  assert.equal(parsed.meal, 'Jantar'); assert.equal(parsed.rows[0].grams, 150);
  assert.equal(parsed.rows[1].grams, ''); assert.throws(() => reviewedItems(parsed.rows));
});
test('colher de pasta usa porção da referência, colher de chá não vira colher de sopa', () => {
  const parsed = parseMealText('No lanche comi uma colher de pasta de amendoim');
  assert.equal(parsed.rows[0].grams, 15); assert.equal(reviewedItems(parsed.rows)[0].calories, 91);
  assert.equal(parseMealText('duas colheres de sopa de creme de avelã').rows[0].grams, 40);
  assert.equal(parseMealText('meia colher de pasta de amendoim').rows[0].grams, 7.5);
  assert.equal(parseMealText('uma colher de chá de pasta de amendoim').rows[0].grams, '');
});
test('alimentos ambíguos e desconhecidos ficam pendentes, sem serem descartados', () => {
  const parsed = parseMealText('100 g de arroz e uma pizza');
  assert.equal(parsed.rows.length, 2); assert.equal(parsed.rows[0].foodId, '');
  assert.equal(parsed.rows[0].candidates.length, 2); assert.equal(parsed.rows[1].foodId, '');
  assert.throws(() => reviewedItems(parsed.rows));
  assert.equal(resolveGrams({ measure: 'spoon', amount: 2 }, 'ninho-recheio'), 40);
});
test('confirma pele, corte e preparo sem confundir coxa com sobrecoxa', () => {
  assert.equal(parseMealText('100 gramas de sobrecoxa sem pele').rows[0].foodId, 'taco-413');
  assert.equal(parseMealText('100 g de coxa de frango assada').rows[0].foodId, 'taco-396');
  assert.equal(parseMealText('100 g de bisteca frita').rows[0].foodId, 'taco-428');
  assert.equal(parseMealText('100 g de sorvete de creme').rows[0].foodId, 'kibon-creme');
});
test('não ignora várias quantidades sem separação e bloqueia relatos vazios', () => {
  const parsed = parseMealText('150 g arroz branco 100 g feijão preto');
  assert.equal(parsed.rows[0].needsSplit, true); assert.throws(() => reviewedItems(parsed.rows));
  assert.equal(parseMealText('150 g de arroz branco com feijão').rows[0].needsSplit, true);
  assert.equal(parseMealText('pão integral com pasta de amendoim').rows[0].needsSplit, true);
  assert.throws(() => parseMealText('')); assert.throws(() => parseMealText('a'.repeat(5001)));
});
test('resultados parciais podem ser revisados sem duplicar transcrição final', () => {
  const result = (text, isFinal) => Object.assign([{ transcript: text }], { isFinal });
  assert.deepEqual(speechText([result('150 gramas de arroz', true), result('e feijão', false)]), { final: '150 gramas de arroz', interim: 'e feijão' });
  assert.deepEqual(speechText([result('150 gramas de arroz', true), result('e cem gramas de feijão', true)]), { final: '150 gramas de arroz e cem gramas de feijão', interim: '' });
});
test('voz local não cai silenciosamente no serviço remoto e libera captura ao sair', () => {
  let instance;
  class Recognition { constructor() { instance = this; } start() { this.started = true; } stop() { this.stopped = true; } abort() { this.aborted = true; } }
  const callbacks = { onText() {}, onStart() {}, onEnd() {}, onError() {} };
  assert.throws(() => createDictation(Recognition, { ...callbacks, local: true }), /no dispositivo/);
  Recognition.prototype.processLocally = false;
  const voice = createDictation(Recognition, { ...callbacks, local: true });
  assert.equal(instance.processLocally, true); assert.equal(instance.lang, 'pt-BR');
  voice.start(); assert.equal(instance.started, true); voice.stop(); assert.equal(instance.stopped, true);
  voice.dispose(); assert.equal(instance.aborted, true); assert.equal(instance.onresult, null);
});

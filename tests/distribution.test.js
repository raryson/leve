import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('ficha Play respeita limites e mantém aviso de saúde nos dois idiomas', () => {
  const listing=JSON.parse(readFileSync(new URL('../distribution/google-play/listing.json',import.meta.url)));
  for(const entry of Object.values(listing)) {
    assert.ok(entry.title.length<=30);
    assert.ok(entry.shortDescription.length<=80);
    assert.ok(entry.fullDescription.length<=4000);
    assert.match(entry.fullDescription,/medical device|dispositivo médico/);
    assert.match(entry.fullDescription,/\/privacy\//);
    assert.match(entry.fullDescription,/\/delete-account\//);
  }
});

test('páginas públicas têm contato, idiomas, exclusão acessível e nenhum script de coleta/login', () => {
  for(const page of ['privacy','support','delete-account','terms']) {
    const html=readFileSync(new URL(`../public/${page}/index.html`,import.meta.url),'utf8');
    assert.match(html,/raryson\.rost@gmail\.com/);
    assert.match(html,/data-language="pt"/);
    assert.match(html,/data-language="en"/);
    assert.match(html,/href="\/delete-account\/"/);
    assert.doesNotMatch(html,/googletagmanager|google-analytics|<script[^>]+src="[^\"]*clerk|<iframe/i);
  }
});

export const speechError = code => ({
  'not-allowed': 'O microfone foi bloqueado. Permita o acesso nas configurações do navegador ou use o texto abaixo.',
  'service-not-allowed': 'O serviço de voz está indisponível neste navegador. Use o texto ou o ditado do teclado.',
  'audio-capture': 'Não foi possível acessar o microfone. Confira se ele está conectado e disponível.',
  'no-speech': 'Não consegui ouvir uma fala. Tente novamente ou digite a refeição.',
  network: 'Falha de conexão no serviço de voz. Sua transcrição anterior foi mantida.',
  'language-not-supported': 'Português não está disponível nesse modo de voz. Use outro modo ou digite o relato.',
  aborted: 'Ditado interrompido. O texto já reconhecido foi mantido.',
}[code] || 'Não foi possível transcrever. Tente novamente ou digite a refeição.');

// Rebuild from the full result list: browsers may revise interim results and
// resend earlier final results. Never append the same final result twice.
export function speechText(results) {
  let final = '', interim = '';
  for (let i = 0; i < results.length; i++) {
    const text = results[i][0]?.transcript || '';
    if (results[i].isFinal) final += `${text} `;
    else interim += `${text} `;
  }
  return { final: final.trim(), interim: interim.trim() };
}

export function createDictation(Recognition, { local, onText, onStart, onEnd, onError }) {
  const recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  if (local) {
    if (!('processLocally' in recognition)) throw new Error('Este navegador não oferece transcrição no dispositivo.');
    recognition.processLocally = true;
  }
  recognition.onresult = event => onText(speechText(event.results));
  recognition.onstart = onStart;
  recognition.onend = onEnd;
  recognition.onerror = event => onError(speechError(event.error));
  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    dispose: () => {
      recognition.onresult = recognition.onstart = recognition.onend = recognition.onerror = null;
      recognition.abort();
    },
  };
}

# Leve — PWA de acompanhamento de peso

MVP em React + Vite, pronto para deploy na Vercel. O registro principal é um dia inteiro: a pessoa conversa com o ChatGPT pelo microfone, recebe perguntas de esclarecimento e importa um JSON com todas as refeições e o total do dia. Perfil, dias e pesagens ficam no `localStorage` nesta primeira versão.

```bash
npm install
npm run dev
npm run build
```

O prompt do fluxo está em `src/main.jsx`. O próximo passo é criar uma rota server-side `/api/food-analysis` para chamar a OpenAI com a chave protegida em variável de ambiente, e depois trocar o armazenamento local por autenticação + banco.

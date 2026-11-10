# Site Chanandry Soluções Imobiliárias

Site 100% front-end (HTML, CSS e JavaScript puro). Sem servidor, sem banco de dados. Funciona no GitHub Pages ou em qualquer hospedagem estática.

## Como editar (painel)
Abra `endereco-do-site/admin.html` (no celular ou computador).
- **Imóveis**: cadastrar, editar, duplicar, ocultar, excluir; fotos são redimensionadas sozinhas.
- **Textos e contatos**: títulos, textos, fotos, Instagram, região, logo.
- **Equipe**: nome, cargo, WhatsApp, foto.
- **Serviços e dúvidas**: cartões de serviços e perguntas frequentes.
- **Ver prévia** mostra o site com suas alterações antes de publicar.

As alterações ficam salvas só no navegador usado até você **publicar**.

## Como publicar
1. **Direto no GitHub** (aba Publicar): informe `usuario/repositorio`, o ramo e um token fine-grained com permissão *Contents: Read and write*. O site atualiza em 1–2 min.
2. **Pacote .zip**: baixe, extraia, e no GitHub use *Add file → Upload files* com a pasta `assets`.

## Estrutura
- `index.html`, `admin.html`
- `assets/js/data.js`: todos os dados (textos, imóveis, equipe). É o que o painel gera.
- `assets/js/site.js`, `core.js`, `admin.js`; `assets/css/`
- `assets/img/`: fotos; `assets/brand/`: ícones

## Pendências de conteúdo
- Os 7 imóveis são **exemplos** (apague no painel quando tiver os reais).
- A logo é provisória: envie a original em *Textos e contatos → Empresa e logo*.
- CRECI pessoal, e-mail e horário estão em branco.

## Observação de segurança
O painel não tem senha: ele só altera o navegador de quem o abre. Nada vai ao ar sem o token do GitHub ou sem o envio do pacote.

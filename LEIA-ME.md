# Gerador de Planner — CECAPE

Sistema web para criar planners em PDF (A4) a partir do modelo "Planner 2027 CECAPE".
Funciona inteiro no navegador: não precisa de banco de dados, PHP, instalação nem terminal.

## Como usar

1. Abra `index.html` no navegador (Chrome ou Edge recomendados).
2. Ajuste as opções no painel à esquerda; a pré-visualização atualiza na hora.
3. Clique em **Imprimir / Salvar PDF** e, na janela de impressão, escolha:
   - Destino: **Salvar como PDF**
   - Papel: **A4**
   - Margens: **Nenhuma**
   - **Gráficos de plano de fundo**: ativado

As opções ficam guardadas no próprio navegador. O logotipo enviado não sai do computador.

## Opções disponíveis (fase 1)

| Grupo | Opções |
|---|---|
| Geral | Ano |
| Títulos | Título da capa, subtítulo, instituição (rodapé), cidade, alinhamento, campo de nome e seu rótulo |
| Logotipo | Imagem própria (PNG/JPG/WebP/SVG até 2 MB); posição na capa (6 posições ou sem logo) e tamanho; posição nas páginas internas (topo direita/esquerda, rodapé, sem logo) e tamanho |
| Calendário | Visão anual (sim/não); **bordas somente nas células com data**; bloco de prioridades e seu título |
| Folhas pautadas | Inserir entre os meses (sim/não); **quantidade de folhas** (1 a 20); título; espaçamento da pauta (5 a 12 mm) |

Com as opções originais e o ano 2027, o resultado reproduz o modelo: 25 páginas.

## Como publicar (cPanel / HostGator)

1. No **Gerenciador de Arquivos** do cPanel, crie a pasta desejada dentro de `public_html`
   (por exemplo `public_html/planner`).
2. Envie para ela `index.html` e a pasta `assets` inteira (pode ser em um `.zip` e depois **Extrair**).
3. Acesse `https://seu-dominio/planner/`.

A pasta `docs` e este arquivo não precisam ir para o servidor.

## Estrutura

```
index.html               tela do gerador
assets/css/planner.css   desenho das páginas do planner (tela e impressão)
assets/css/app.css       interface do gerador
assets/js/config.js      opções padrão, validação e gravação no navegador
assets/js/pages.js       montagem das páginas (capa, visão anual, mês, pautada)
assets/js/app.js         formulário, pré-visualização e impressão
assets/img/              logotipo padrão
docs/ESTUDO-PLANNERS.md  estudo de mercado que orienta as próximas fases
```

Não há `config.php` nem `schema.sql` nesta fase porque nada roda no servidor. Eles entram
na fase 4, se for aprovado guardar modelos no servidor.

## Próximas fases (dependem de aprovação)

- **Fase 2 — opções dos melhores planners:** início da semana (dom/seg), mês inicial e duração
  (ano letivo), feriados, número da semana, fases da lua, tipos de pauta (linhas, pontilhado,
  quadriculado, branco), páginas semanais, metas, tracker de hábitos, revisão mensal, datas próprias.
- **Fase 3 — diferenciais:** calendário letivo do CECAPE impresso nas células, feriados de SP e de
  São Caetano do Sul com contagem de dias letivos, pauta Cornell, pauta/ata de HTPC, lista de
  chamada com datas reais, opções de impressão (margem de encadernação, frente e verso, economia
  de tinta, livreto A5), acessibilidade, PDF com links, exportar/importar modelo.
- **Fase 4 — servidor (opcional):** PHP + MySQL para guardar e compartilhar modelos entre usuários.

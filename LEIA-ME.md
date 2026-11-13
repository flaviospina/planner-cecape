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

## Opções disponíveis

| Grupo | Opções |
|---|---|
| Período | Mês inicial e ano (permite ano letivo), duração de 1 a 18 meses, semana começando na segunda ou no domingo |
| Títulos | Título da capa, subtítulo, instituição (rodapé), cidade, alinhamento, campo de nome e seu rótulo |
| Logotipo | Imagem própria (PNG/JPG/WebP/SVG até 2 MB); posição na capa (6 posições ou sem logo) e tamanho; posição nas páginas internas (topo direita/esquerda, rodapé, sem logo) e tamanho |
| Calendário | Visão anual; **bordas somente nas células com data**; número da semana (ISO); feriados nacionais, estadual de SP e municipais; pontos facultativos; fases da lua; datas próprias; bloco de prioridades |
| Calendário letivo | Períodos letivos (bimestres); recessos e férias; eventos recorrentes (HTPC, conselhos, reuniões); página de resumo com dias letivos; pauta e ata por reunião; lista de chamada por turma |
| Páginas extras | Metas; hábitos (uma por mês); páginas semanais (dias em linhas, colunas com horários ou plano de aula com BNCC); revisão do mês |
| Folhas de anotações | Inserir entre os meses; **quantidade de folhas** (1 a 20); tipo (pautada, pontilhada, quadriculada, Cornell, em branco); título; espaçamento (5 a 12 mm) |
| Impressão e acessibilidade | Margem de encadernação; frente e verso; livreto A5; economia de tinta; fonte ampliada; alto contraste; abas e links de navegação |
| Modelo | Exportar e importar todas as opções em um arquivo `.json` |

Com as opções originais e o ano 2027, o resultado reproduz o modelo: 25 páginas.

### Como os dados de calendário são obtidos

- **Feriados nacionais:** calculados para qualquer ano (os móveis, a partir da data da Páscoa).
- **Feriado estadual:** 9 de julho (Revolução Constitucionalista).
- **Feriados municipais:** lista editável, que vem com o aniversário de São Caetano do Sul (28/07).
  **Confira e complete a lista** com o calendário oficial da Prefeitura antes de imprimir.
- **Fases da lua:** calculadas pelo algoritmo de Jean Meeus, com precisão de poucos minutos,
  e convertidas para o horário de Brasília. Os símbolos seguem a aparência no hemisfério sul.
- **Datas próprias:** uma por linha. `15/10 Dia do Professor` repete todo ano;
  `01/02/2027 Início das aulas` vale só naquele ano. Linhas inválidas são apontadas e ignoradas.

### Calendário letivo

- **Períodos letivos** e **recessos:** uma linha por intervalo, `01/02/2027 a 30/04/2027 1º bimestre`.
  O planner marca o início e o fim de cada período, hachura os recessos e conta os dias letivos
  (segunda a sexta, dentro de um período, sem feriado, ponto facultativo ou recesso).
- **Eventos recorrentes:** `seg HTPC` (toda segunda), `1ª qua Conselho de classe`,
  `última sex Reunião de pais`. Não caem em feriado nem em recesso e, havendo períodos letivos,
  só aparecem dentro deles.
- **Pauta e ata:** gera uma página para cada data ou evento recorrente cujo texto contenha a
  palavra informada (por exemplo, `HTPC`).
- **Lista de chamada:** uma linha `Turma: 5º A | seg, qua, sex` e, abaixo, um aluno por linha.
  As colunas são as datas reais das aulas da turma em cada mês. Sem nomes, a lista sai em branco.

### Dados pessoais (LGPD)

Os nomes de alunos digitados ficam apenas no navegador de quem os digitou, no PDF gerado e no
arquivo de modelo exportado. Nada é enviado para servidor. Em computador compartilhado, use
**Restaurar modelo original** ao terminar, para apagar as listas. Ao enviar um modelo exportado a
outra pessoa, lembre que ele leva os nomes junto.

### Impressão

- **Margem de encadernação:** espaço extra do lado da espiral ou do grampo. Com **frente e verso**,
  ela alterna de lado nas páginas pares.
- **Livreto A5:** duas páginas por folha A4 deitada, já na ordem de dobra. Imprima em frente e
  verso virando na **borda curta**, dobre o maço ao meio e grampeie na dobra.
- **Abas e links:** no PDF salvo pelo Chrome ou Edge, as abas dos meses e os dias (quando há
  páginas semanais) são clicáveis, para uso em tablet.

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
assets/js/calendar.js    semanas, feriados, fases da lua, datas próprias, períodos letivos e turmas
assets/js/pages.js       montagem das páginas (capa, visão anual, mês, semana, extras)
assets/js/app.js         formulário, pré-visualização e impressão
assets/img/              logotipo padrão
docs/ESTUDO-PLANNERS.md  estudo de mercado que orienta as próximas fases
```

Não há `config.php` nem `schema.sql` nesta fase porque nada roda no servidor. Eles entram
na fase 4, se for aprovado guardar modelos no servidor.

## Próxima fase (depende de aprovação)

- **Fase 4 — servidor (opcional):** PHP + MySQL para guardar e compartilhar modelos entre usuários.

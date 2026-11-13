# Gerador de Planner — CECAPE

Sistema web para criar planners em PDF (A4) a partir do modelo "Planner 2027 CECAPE".

O gerador funciona de duas formas:

- **Sem servidor:** basta abrir `index.html` no navegador. Não precisa de banco de dados nem de PHP.
- **Com servidor (PHP + MySQL):** acrescenta a seção **Modelos no servidor**, com login, para
  guardar modelos e compartilhá-los entre os usuários. A instalação está em "Como publicar".

## Como usar

1. Abra o gerador no navegador (Chrome ou Edge recomendados).
2. Ajuste as opções no painel à esquerda; a pré-visualização atualiza na hora.
3. Clique em **Imprimir / Salvar PDF**. Uma caixa mostra o número de páginas e o que conferir na
   janela de impressão; confirme em **Abrir impressão** e escolha:
   - Destino: **Salvar como PDF**
   - Papel: **A4**
   - Margens: **Nenhuma**
   - **Gráficos de plano de fundo**: ativado

Toda ação que altera ou apaga algo (imprimir, exportar, importar, restaurar, salvar, excluir, sair)
abre uma caixa explicando o que vai acontecer, com um botão para confirmar e outro para cancelar.

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

### Só o gerador (sem login)

1. No **Gerenciador de Arquivos** do cPanel, crie a pasta dentro de `public_html` (por exemplo `public_html/planner`).
2. Envie `index.html`, `.htaccess` e a pasta `assets` inteira (pode ser em `.zip` e depois **Extrair**).
3. Acesse `https://seu-dominio/planner/`.

### Com modelos no servidor (PHP 8.2 + MySQL)

1. **Banco:** em cPanel > **Bancos de dados MySQL**, crie um banco e um usuário, e dê ao usuário
   todos os privilégios sobre esse banco.
2. **Tabelas:** no **phpMyAdmin**, selecione o banco, abra **Importar** e envie `sql/schema.sql`.
3. **Arquivos:** envie o projeto inteiro para a pasta (zip > Extrair). No Gerenciador de Arquivos,
   ative **Configurações > Mostrar arquivos ocultos** para ver `.htaccess` e `.env.example`.
4. **Configuração:** copie `.env.example` para `.env` (na mesma pasta) e preencha `DB_NAME`,
   `DB_USER` e `DB_PASS` com os dados do passo 1.
5. **Administrador:** acesse `https://seu-dominio/planner/instalar.php` e crie a conta do
   administrador. Não existe senha padrão; a página deixa de funcionar depois do primeiro cadastro.
6. **Usuários:** entre no gerador, em **Modelos no servidor**, e clique em **Usuários** para
   cadastrar os colegas. Cada um recebe uma senha provisória e é obrigado a trocá-la no primeiro acesso.

Confira no cPanel > **Selecionar versão do PHP** se a pasta usa PHP 8.2 ou superior.

### Ao atualizar uma versão já publicada

Substitua **sempre juntos** o `index.html` e a pasta `assets` inteira. Se o navegador misturar
arquivos de versões diferentes, o gerador mostra um aviso vermelho no topo pedindo `Ctrl` + `F5`.
O `.env` e o banco não precisam ser refeitos.

### Segurança e dados pessoais (servidor)

- Senhas guardadas com `password_hash`; sessão renovada no login; token CSRF em toda alteração.
- Após 5 senhas erradas para o mesmo e-mail, o login fica bloqueado por 15 minutos.
- As pastas `app`, `sql`, `logs` e `docs` e os arquivos `.env`, `.sql`, `.md` e `.log` não são
  servidos (regras nos arquivos `.htaccess`).
- Do usuário guardam-se apenas nome, e-mail e senha criptografada. **Excluir**, na tela de
  usuários, apaga a conta e os modelos dela (pedido de exclusão do titular).
- **Nomes de alunos nunca vão para o servidor:** ao salvar um modelo, ficam só as turmas e os
  dias de aula. Os nomes continuam apenas no navegador e no arquivo exportado.
- Toda ação fica registrada na tabela `action_logs` (quem, quando, o quê e o IP).
- Erros do PHP vão para `logs/php-error.log`, sem aparecer na tela.

## Estrutura

```
index.html               tela do gerador
instalar.php             cria o primeiro administrador (só enquanto não há usuários)
usuarios.php             cadastro de usuários (administradores)
.htaccess                bloqueios, cabeçalhos de segurança e de cache
.env.example             modelo do arquivo de configuração (.env)
api/session.php          sessão atual e token CSRF
api/login.php            entrar
api/logout.php           sair
api/password.php         trocar a própria senha
api/templates.php        listar, abrir, salvar e excluir modelos
app/config.php           leitura do .env e limites da aplicação
app/Database.php         conexão PDO com o MySQL
app/bootstrap.php        sessão, autenticação, CSRF, respostas JSON e registro de ações
app/view.php             moldura das páginas administrativas
sql/schema.sql           tabelas (users, planner_templates, action_logs)
logs/                    log de erros do PHP
assets/css/planner.css   desenho das páginas do planner (tela e impressão)
assets/css/app.css       interface do gerador e caixas de diálogo
assets/css/admin.css     páginas administrativas
assets/js/config.js      opções padrão, validação e gravação no navegador
assets/js/calendar.js    semanas, feriados, fases da lua, datas próprias, períodos letivos e turmas
assets/js/pages.js       montagem das páginas do planner
assets/js/dialogs.js     caixas de confirmação, avisos e formulários (SweetAlert2)
assets/js/app.js         formulário, pré-visualização, impressão, exportar e importar
assets/js/server.js      modelos no servidor (login, salvar, carregar, excluir)
assets/js/admin.js       confirmações das páginas administrativas
assets/vendor/           SweetAlert2 11.26 (licença MIT), incluído no projeto: não depende de internet
assets/img/              logotipo padrão
docs/ESTUDO-PLANNERS.md  estudo de mercado que orientou as opções
```

### Número de versão dos arquivos

O `index.html` carrega os arquivos com `?v=4` e confere se todos são da mesma versão. Ao alterar
qualquer arquivo de `assets`, aumente juntos: os `?v=` e a constante `BUILD` no `index.html`, o
`PlannerBuild` no início de cada script de `assets/js` e `ASSET_VERSION` em `app/view.php`.

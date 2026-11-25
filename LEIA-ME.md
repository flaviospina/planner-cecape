# Gerador de Planner — CECAPE

Sistema web para criar planners em PDF a partir do modelo "Planner 2027 CECAPE".

O acesso é restrito: entra quem tem conta institucional `@scseduca.com.br` (pelo Google) ou uma
conta criada pelo administrador (e-mail e senha). O sistema roda em servidor com PHP 8.2; o banco
MySQL é opcional e habilita os modelos guardados no servidor e as contas por e-mail e senha.

## Como usar

1. Abra o endereço do planner no navegador (Chrome ou Edge recomendados) e entre com a sua conta.
2. Escolha o **idioma** do planner na barra superior e ajuste as opções pelo **menu** (Período,
   Títulos, Logotipo, Calendário, Letivo, Páginas, Anotações, Impressão, Modelos). Cada item abre
   uma caixa ao lado da pré-visualização, que atualiza na hora; **Concluir** fecha a caixa.
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
| Idioma | Português (Brasil), inglês (EUA), espanhol, italiano e francês |
| Período | Mês inicial e ano (permite ano letivo), duração de 1 a 18 meses, semana começando na segunda ou no domingo |
| Títulos | Título da capa, subtítulo, instituição (rodapé), cidade, alinhamento, campo de nome (rótulo, nome impresso em destaque e tamanho do campo) |
| Logotipo | Imagem própria (PNG/JPG/WebP/SVG até 2 MB); posição na capa (6 posições ou sem logo) e tamanho; posição nas páginas internas (topo direita/esquerda, rodapé, sem logo) e tamanho |
| Calendário | Visão anual; **bordas somente nas células com data**; número da semana (ISO); feriados nacionais, estadual de SP e municipais; pontos facultativos; fases da lua; datas próprias; bloco de prioridades |
| Calendário letivo | Períodos letivos (bimestres); recessos e férias; eventos recorrentes (HTPC, conselhos, reuniões); página de resumo com dias letivos; pauta e ata por reunião; lista de chamada por turma |
| Páginas extras | Metas; hábitos (uma por mês); páginas semanais (dias em linhas, colunas com horários ou plano de aula com BNCC); revisão do mês |
| Folhas de anotações | Inserir entre os meses; **quantidade de folhas** (1 a 20); tipo (pautada, pontilhada, quadriculada, Cornell, em branco); título; espaçamento (5 a 12 mm) |
| Impressão e acessibilidade | Papel (A4, Carta, Ofício, Ofício 2, A3, A5, B5); orientação retrato ou paisagem; páginas por folha (uma, duas em sequência, livreto); margem de encadernação; frente e verso; economia de tinta; fonte ampliada; alto contraste; abas e links de navegação |
| Modelo | Exportar e importar todas as opções em um arquivo `.json` |

Com as opções originais e o ano 2027, o resultado reproduz o modelo: 25 páginas.

### Idioma

O idioma vale para **tudo o que é impresso no planner**: meses, dias da semana, títulos das
páginas, nomes dos feriados, fases da lua e formato das datas. A interface do gerador (menu e
caixas de opções) continua em português.

- Os textos que você pode editar (subtítulo, rótulo do nome, título das prioridades e das
  anotações) acompanham o idioma enquanto estiverem no texto padrão; se você os personalizou,
  eles são mantidos.
- Os feriados continuam sendo os brasileiros, com o nome traduzido.
- As listas digitadas (datas próprias, eventos recorrentes, turmas) são sempre escritas no formato
  em português (`15/10 Texto`, `seg HTPC`).
- Os textos ficam em `assets/js/i18n.js`; para corrigir uma tradução, basta editar esse arquivo.

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
- **Papel:** A4, Carta (Letter), Ofício (Legal), Ofício 2, A3, A5 ou B5. As páginas são
  desenhadas na proporção do A4 e ajustadas ao papel escolhido, centralizadas; em papéis de outra
  proporção (Carta, Ofício) sobra uma margem um pouco maior em dois lados. Ao imprimir em papel,
  selecione o mesmo tamanho nas opções da impressora.
- **Orientação:** retrato ou **paisagem**. Em paisagem todas as páginas têm desenho próprio: capa
  com o nome ao lado dos títulos, visão anual em 4 colunas, calendário mensal com as prioridades em
  coluna à direita, revisão, resumo letivo e ata em duas colunas.
- **Páginas por folha** (só em retrato):
  - **Uma por folha** (padrão).
  - **Duas por folha, em sequência** (1 e 2, 3 e 4…), na folha deitada; depois é só cortar ao meio.
  - **Livreto:** as páginas são reorganizadas para a dobra **somente na impressão**. Imprima em
    frente e verso virando na **borda curta**, dobre o maço ao meio e grampeie.

  A pré-visualização fica sempre na ordem de leitura. Com duas páginas por folha, se faltarem
  páginas para completar a última folha, o planner ganha folhas de anotações no final.
- **Abas e links:** no PDF salvo pelo Chrome ou Edge, as abas dos meses e os dias (quando há
  páginas semanais) são clicáveis, para uso em tablet.

## Controle de acesso

### Como funciona

- **Conta `@scseduca.com.br`:** a pessoa clica em "Entrar com a conta @scseduca.com.br" e é levada
  à tela do Google. É o Google que confirma que a conta existe e pertence a quem está entrando; não
  há como digitar um e-mail qualquer. O planner não recebe nem guarda a senha.
- **Pessoas de fora do domínio:** entram por e-mail e senha, em contas criadas pelo administrador
  na tela **Usuários**. Exige o banco de dados.
- O planner confere duas coisas na resposta do Google: o e-mail termina em `@scseduca.com.br` **e**
  o Google atesta que a conta pertence à organização. Um Gmail comum é recusado.
- Conta desativada pela Secretaria deixa de entrar. Conta por senha desativada na tela Usuários
  perde o acesso na hora.
- Quem não entrou vê apenas a tela de entrada. O gerador (`app/views/gerador.html`) só é entregue
  pelo `index.php` depois do login.

### Limite que você deve conhecer

Os arquivos de `assets` (scripts, estilos e imagens) continuam públicos, porque a tela de entrada
precisa deles. Eles não contêm dados de ninguém, mas uma pessoa com conhecimento técnico poderia
baixá-los e montar uma cópia do gerador em outro lugar. O que fica protegido é o uso do sistema
neste endereço, os modelos guardados e os registros de acesso.

### Criar a credencial no Google (uma vez)

Feito por alguém com conta `@scseduca.com.br`, de preferência o administrador de TI. Os nomes das
telas do Google mudam com o tempo; a sequência é esta:

1. Acesse `console.cloud.google.com` com a conta institucional e crie um **projeto** (por exemplo,
   "Planner CECAPE").
2. Em **APIs e serviços > Tela de consentimento OAuth**, escolha o tipo **Interno**. Assim só
   contas da organização conseguem entrar. Preencha o nome do aplicativo ("Gerador de Planner") e
   um e-mail de suporte.
3. Em **APIs e serviços > Credenciais**, clique em **Criar credenciais > ID do cliente OAuth**,
   tipo **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, adicione exatamente:
   `https://sist.cecapescs.com.br/planner/auth/callback.php`
5. Copie o **ID do cliente** e a **chave secreta** para o arquivo `.env` (`GOOGLE_CLIENT_ID` e
   `GOOGLE_CLIENT_SECRET`). A chave secreta não deve ser enviada por e-mail nem por mensagem.

Se o tipo "Interno" não estiver disponível, a conta usada não pertence à organização no Google
Workspace; peça ao administrador de TI para criar o projeto.

### Arquivo `.env`

```
APP_URL=https://sist.cecapescs.com.br/planner
AUTH_DOMAIN=scseduca.com.br
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

O `APP_URL` tem que ser igual ao endereço cadastrado no Google (sem a barra no final). As linhas
`DB_*` só são necessárias para os modelos no servidor e para as contas por e-mail e senha.

### Registro de acessos

Com o banco configurado, cada entrada, saída e tentativa recusada fica na tabela `action_logs`
(ação, e-mail, IP e horário). Quem entra pelo Google ganha um cadastro automático, sem senha
utilizável, para poder guardar modelos.

## Como publicar

### Ao atualizar a partir de uma versão sem login

1. Envie o pacote e extraia por cima da pasta `planner`.
2. **Apague o arquivo `index.html`** que ficou na pasta. Ele é da versão antiga, não passa pelo
   login e, se continuar lá, o gerador fica aberto.
3. Preencha o `.env` (seção acima).
4. Ajuste a regra do nginx conforme `docs/nginx-planner.conf`.

### Servidor com Apache (cPanel / HostGator)

1. No **Gerenciador de Arquivos**, crie a pasta dentro de `public_html` e envie o projeto inteiro
   (zip > Extrair). Ative **Mostrar arquivos ocultos** para ver `.htaccess` e `.env.example`.
2. Copie `.env.example` para `.env` e preencha.
3. Confira em **Selecionar versão do PHP** se a pasta usa PHP 8.2 ou superior, com a extensão `curl`.

### Banco de dados (opcional)

1. Crie um banco e um usuário MySQL com todos os privilégios sobre esse banco.
2. Importe `sql/schema.sql` (phpMyAdmin > Importar).
3. Preencha `DB_NAME`, `DB_USER` e `DB_PASS` no `.env`.
4. Acesse `instalar.php` e crie a conta do administrador. Não existe senha padrão; a página deixa
   de funcionar depois do primeiro cadastro.
5. Em **Modelos > Usuários**, cadastre as pessoas de fora do domínio. Cada uma recebe uma senha
   provisória e é obrigada a trocá-la no primeiro acesso.

### Ao atualizar uma versão já publicada

Substitua **sempre juntos** os arquivos PHP e a pasta `assets` inteira. Se o navegador misturar
arquivos de versões diferentes, o gerador mostra um aviso vermelho no topo pedindo `Ctrl` + `F5`.
O `.env` e o banco não precisam ser refeitos.

### Segurança e dados pessoais

- Contas institucionais: nenhuma senha passa pelo planner. Do Google chegam apenas nome e e-mail.
- Contas por senha: senhas guardadas com `password_hash`; após 5 senhas erradas para o mesmo
  e-mail, o login fica bloqueado por 15 minutos.
- Sessão renovada a cada login e token CSRF em toda alteração.
- As pastas `app`, `sql`, `logs` e `docs` e os arquivos `.env`, `.sql`, `.md` e `.log` não são
  servidos (regras do `.htaccess` ou do nginx).
- **Excluir**, na tela de usuários, apaga a conta e os modelos dela (pedido de exclusão do titular).
- **Nomes de alunos nunca vão para o servidor:** ao salvar um modelo, ficam só as turmas e os
  dias de aula.
- Erros do PHP vão para `logs/php-error.log`, sem aparecer na tela.

### Servidor com nginx (sem Apache)

Os arquivos `.htaccess` só valem em servidores Apache. Com nginx + PHP-FPM (caso do servidor do
CECAPE), eles são ignorados, e o bloqueio das pastas `app`, `sql`, `logs` e `docs` e dos arquivos
ocultos precisa estar na configuração do nginx. As regras prontas estão em
`docs/nginx-planner.conf`. A pasta do planner fica liberada para a internet, porque o controle
de quem entra passou a ser feito pelo próprio sistema.

### Imagem de compartilhamento (WhatsApp, Facebook, LinkedIn)

A tela de entrada (pública) tem as metatags de compartilhamento (Open Graph e Twitter), apontando para
`https://sist.cecapescs.com.br/planner`, e duas imagens: `assets/img/compartilhar.jpg`
(1200 × 630) e `assets/img/compartilhar-quadrada.jpg` (1200 × 1200), além dos ícones do site.

Para a prévia aparecer, as redes sociais precisam conseguir abrir a tela de entrada e as imagens
**de fora da rede** (regra do nginx em `docs/nginx-planner.conf`). Se o planner mudar de endereço,
troque a variável `$site` no início de `app/views/login.php`.

Para conferir, use o depurador do Facebook (developers.facebook.com/tools/debug); o WhatsApp
guarda a prévia antiga por algum tempo.

## Estrutura

```
index.php                porta de entrada: confere o login e entrega o gerador
sair.php                 encerra a sessão
auth/google.php          inicia o login com a conta Google
auth/callback.php        retorno do Google: valida a conta e abre a sessão
auth/senha.php           login por e-mail e senha (contas criadas pelo administrador)
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
app/auth.php             controle de acesso: regras do domínio, Google e senha
app/views/login.php      tela de entrada (pública, com as metatags de compartilhamento)
app/views/gerador.html   tela do gerador, entregue só a quem entrou
app/view.php             moldura das páginas administrativas
sql/schema.sql           tabelas (users, planner_templates, action_logs)
logs/                    log de erros do PHP
assets/css/planner.css   desenho das páginas do planner (tela e impressão)
assets/css/app.css       interface do gerador e caixas de diálogo
assets/css/admin.css     páginas administrativas
assets/css/login.css     tela de entrada
assets/js/i18n.js        textos do planner nos cinco idiomas
assets/js/config.js      opções padrão, validação e gravação no navegador
assets/js/calendar.js    semanas, feriados, fases da lua, datas próprias, períodos letivos e turmas
assets/js/pages.js       montagem das páginas do planner
assets/js/dialogs.js     caixas de confirmação, avisos e formulários (SweetAlert2)
assets/js/app.js         menu, caixas de opções, pré-visualização, impressão, exportar e importar
assets/js/server.js      modelos no servidor (login, salvar, carregar, excluir)
assets/js/admin.js       confirmações das páginas administrativas
assets/vendor/           SweetAlert2 11.26 (licença MIT), incluído no projeto: não depende de internet
assets/img/              logotipo padrão, imagem de compartilhamento e ícones
docs/ESTUDO-PLANNERS.md  estudo de mercado que orientou as opções
```

### Número de versão dos arquivos

O gerador carrega os arquivos com `?v=7` e confere se todos são da mesma versão. Ao alterar
qualquer arquivo de `assets`, aumente juntos: os `?v=` e a constante `BUILD` em `app/views/gerador.html`, o `$v` em `app/views/login.php`, o
`PlannerBuild` no início de cada script de `assets/js` e `ASSET_VERSION` em `app/view.php`.

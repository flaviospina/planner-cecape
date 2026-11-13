-- sql/schema.sql
-- Gerador de Planner CECAPE — tabelas da fase 4 (modelos guardados no servidor).
-- Importar no phpMyAdmin. Pode ser executado mais de uma vez sem perder dados.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    email                VARCHAR(190) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    role                 ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
    active               TINYINT(1) NOT NULL DEFAULT 1,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modelos de planner: o campo config guarda, em JSON, todas as opções da tela.
-- Os nomes de alunos são removidos pelo servidor antes de gravar (LGPD).
CREATE TABLE IF NOT EXISTS planner_templates (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    name       VARCHAR(80) NOT NULL,
    is_shared  TINYINT(1) NOT NULL DEFAULT 0,
    config     MEDIUMTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_templates_user (user_id),
    KEY idx_templates_shared (is_shared),
    CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de ações: quem, quando, o quê. Também serve para limitar tentativas de login.
CREATE TABLE IF NOT EXISTS action_logs (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NULL,
    action     VARCHAR(40) NOT NULL,
    details    VARCHAR(255) NOT NULL DEFAULT '',
    ip         VARCHAR(45) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_logs_action_time (action, created_at),
    KEY idx_logs_user (user_id),
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- O primeiro administrador é criado pela página instalar.php (não há senha padrão).

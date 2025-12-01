CREATE TABLE
  -- CRM crm сервис
  order_crm_details (
    order_id uuid PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    -- Ответственный менеджер/владелец заказа
    owner_id uuid REFERENCES users (id) ON DELETE SET NULL,
    -- Время назначения ответственного
    assigned_at timestamptz,
    -- Дата/время окончания удержания
    hold_until timestamptz,
    -- Срок SLA
    sla_due_at timestamptz,
    -- Заметка клиента
    customer_note varchar(255),
    -- Административная заметка (для операторов)
    admin_note varchar(255),
    -- Приоритет заказа
    priority int NOT NULL DEFAULT 0
  );

-- CRM/notifications (выделено из orders.sql)
CREATE TABLE
  order_notifications (
    -- Уникальный идентификатор уведомления
    id uuid PRIMARY KEY ,
    -- Ссылка на заказ
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE NOT NULL,
    -- Тип уведомления: EMAIL | SMS
    notification_type varchar(32) NOT NULL,
    -- Провайдер уведомлений (например: internal, mailgun, twilio)
    provider text,
    -- Внешний идентификатор у провайдера
    external_id text,
    -- Получатель (email-адрес или номер телефона)
    recipient varchar(255) NOT NULL,
    -- Текст сообщения
    message text,
    -- Статус отправки: SENT | FAILED
    status varchar(32) NOT NULL,
    -- Время отправки (если отправлено)
    sent_at timestamptz,
    -- Время создания записи
    created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON order_notifications (order_id);

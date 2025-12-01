-- =========================================================
-- ПЛАТЕЖИ (намерения) И ТРАНЗАКЦИИ (авторизация/списание/возврат/отмена/спор)
-- =========================================================
CREATE TABLE IF NOT EXISTS
  order_payments (
    -- UUID платёжного намерения
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- ссылка на заказ; каскадное удаление вместе с заказом
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    -- PSP/провайдер: 'stripe','adyen','liqpay','paypal','bank_transfer', …
    provider text NOT NULL,
    -- способ у провайдера: 'карта','sepa_debit','pix','наличные','наложенный платеж', …
    method text,
    -- валюта операции в PSP (может отличаться от валюты заказа)
    currency_code char(3) NOT NULL REFERENCES currency_codes (code),
    -- запрошенная сумма к оплате в минорных единицах
    amount_intended int NOT NULL CHECK (amount_intended >= 0),
    -- статус намерения: pending/authorized/captured/… (enum payment_status)
    status varchar(24) NOT NULL DEFAULT 'pending',
    CONSTRAINT ck_order_payments_status CHECK (status IN ('pending','authorized','captured','refunded','void','failed')),
    -- нужен ли экшен покупателя (3DS, редирект и т.п.)
    requires_action boolean NOT NULL DEFAULT false,
    -- версия 3-D Secure, если есть (например '2.2.0')
    three_ds_version text,
    -- отпечаток устройства/карты/сессии для антифрода
    fingerprint text,
    -- внешний ID намерения/чекаута у PSP
    external_pi_id text,
    -- произвольные служебные данные
    metadata jsonb NOT NULL DEFAULT '{}',
    -- когда создано платёжное намерение
    created_at timestamptz NOT NULL DEFAULT now(),
    -- когда запись в последний раз обновлялась
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX IF NOT EXISTS idx_payments_order ON order_payments (order_id);

-- быстрый поиск всех платежей по заказу
-- CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON order_payments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at ();

CREATE TABLE IF NOT EXISTS
  payment_transactions (
    -- UUID транзакции
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- ссылка на payment intent; удаляется вместе с ним
    order_payment_id uuid NOT NULL REFERENCES order_payments (id) ON DELETE CASCADE,
    -- тип операции: 'авторизация','списание','возврат','отмена','спор','оспаривание'
    kind varchar(24) NOT NULL,
    -- сумма операции в минорных единицах (>= 0)
    amount int NOT NULL CHECK (amount >= 0),
    -- внешний ID транзакции у PSP (charge/capture/refund/…)
    external_tx_id text,
    -- код ответа / причины от процессинга / банка
    processor_code text,
    -- человекочитаемое сообщение от процессинга
    processor_message text,
    -- признак успешности операции у провайдера
    succeeded boolean NOT NULL DEFAULT true,
    -- фактическое время совершения операции
    occurred_at timestamptz NOT NULL DEFAULT now(),
    -- дополнительные данные операции (raw payload, артефакты и пр.)
    metadata jsonb NOT NULL DEFAULT '{}'
  );

CREATE INDEX IF NOT EXISTS idx_pt_payment ON payment_transactions (order_payment_id);
CREATE INDEX IF NOT EXISTS idx_pt_kind ON payment_transactions (kind);

-- Учет / сводки денежных потоков
-- Сумма, на которую поставлен холд на карте/средствах покупателя.
-- Деньги ещё не списаны и могут быть частично/полностью захолдированы по нескольким платежам.
-- Инварианты: >= 0; обычно amount_captured <= amount_authorized.
-- amount_authorized int NOT NULL DEFAULT 0 CHECK (amount_authorized >= 0),
-- Фактически захваченная (списанная) сумма, ушедшая в клиринг/расчёты.
-- Может быть меньше авторизации (partial capture) и набираться несколькими транзакциями capture.
-- Инварианты: >= 0; обычно amount_refunded <= amount_captured.
-- amount_captured int NOT NULL DEFAULT 0 CHECK (amount_captured >= 0),
-- Возвращённая покупателю сумма (refund), часто допускается частичный возврат.
-- Может происходить несколькими транзакциями refund.
-- amount_refunded int NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0),

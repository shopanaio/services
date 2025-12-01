CREATE TABLE
	discount (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		created_at timestamptz NOT NULL DEFAULT now(),
		updated_at timestamptz NOT NULL DEFAULT now(),
		deleted_at timestamptz,
		expired_at timestamptz,
		cancelled_at timestamptz,
		expiration_date timestamptz,
		is_fixed boolean NOT NULL,
		amount integer NOT NULL,
		percentage integer NOT NULL,
		code varchar(255) NOT NULL,
		name varchar(255) NOT NULL,
		description text,
		discount_active boolean NOT NULL,
		CHECK (amount >= 0)
	);

CREATE INDEX idx_discount_deleted_at ON discount (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE UNIQUE INDEX idx_discount_code_unique_live ON discount (project_id, code) WHERE deleted_at IS NULL;

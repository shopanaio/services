ALTER TABLE delivery.checkout_selection_commitments
  ADD COLUMN released_at timestamptz,
  ADD COLUMN released_reason text;

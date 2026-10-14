ALTER TABLE leve_community_foods ADD COLUMN creation_payload jsonb;
UPDATE leve_community_foods SET creation_payload=jsonb_build_object('food',food,'share',status IN ('pending','published'));
ALTER TABLE leve_community_foods ALTER COLUMN creation_payload SET NOT NULL;

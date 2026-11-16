-- PROPOSAL ONLY. Separate retirement phase, blocked until real references and explicit resolutions are reviewed.
BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE taxiqaid_private.departments,taxiqaid_private.user_departments IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE approved_department_resolution(old_key text PRIMARY KEY,new_key text NOT NULL,owner_reviewed boolean NOT NULL DEFAULT false) ON COMMIT DROP;
-- Owner must insert reviewed mappings here. No default mapping is invented for financial/customer_service/planning.
DO $$ BEGIN
 IF EXISTS(SELECT FROM pg_constraint WHERE confrelid='taxiqaid_private.departments'::regclass AND conrelid<>'taxiqaid_private.user_departments'::regclass) THEN RAISE EXCEPTION 'ADDITIONAL_DEPARTMENT_REFERENCES_REQUIRE_REVIEW';END IF;
 IF EXISTS(SELECT FROM approved_department_resolution WHERE NOT owner_reviewed OR old_key NOT IN ('customer_service','financial','planning') OR new_key NOT IN ('operation','fleet','maintenance','finance','hr','qhse','it')) THEN RAISE EXCEPTION 'INVALID_DEPARTMENT_RESOLUTION';END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.user_departments m JOIN taxiqaid_private.user_accounts a USING(user_id) WHERE a.role_key='super_admin' AND m.department_key IN ('customer_service','financial','planning')) THEN RAISE EXCEPTION 'MASTER_LEGACY_MEMBERSHIP_REQUIRES_SEPARATE_OWNER_DECISION';END IF;
 IF EXISTS(SELECT FROM taxiqaid_private.user_departments m WHERE m.department_key NOT IN ('operation','fleet','maintenance','finance','hr','qhse','it') AND NOT EXISTS(SELECT FROM approved_department_resolution r WHERE r.old_key=m.department_key AND r.owner_reviewed)) THEN RAISE EXCEPTION 'AMBIGUOUS_DEPARTMENT_MEMBERSHIPS: no changes applied';END IF;
 IF (SELECT count(*) FROM taxiqaid_private.departments WHERE department_key IN ('operation','fleet','maintenance','finance','hr','qhse','it') AND is_active)<>7 THEN RAISE EXCEPTION 'SEVEN_ACTIVE_DEPARTMENTS_REQUIRE_OWNER_REVIEW';END IF;
END $$;
INSERT INTO taxiqaid_private.user_departments(user_id,department_key,assigned_at) SELECT m.user_id,r.new_key,min(m.assigned_at) FROM taxiqaid_private.user_departments m JOIN approved_department_resolution r ON r.old_key=m.department_key AND r.owner_reviewed GROUP BY m.user_id,r.new_key ON CONFLICT(user_id,department_key) DO NOTHING;
DELETE FROM taxiqaid_private.user_departments m USING approved_department_resolution r WHERE m.department_key=r.old_key AND r.owner_reviewed AND EXISTS(SELECT FROM taxiqaid_private.user_departments keep WHERE keep.user_id=m.user_id AND keep.department_key=r.new_key);
UPDATE taxiqaid_private.departments SET is_active=false WHERE department_key IN ('customer_service','financial','planning') AND NOT EXISTS(SELECT FROM taxiqaid_private.user_departments WHERE department_key=departments.department_key);
-- Department rows are retained. New choices already use exactly seven; historical access remains readable until this phase succeeds.
COMMIT;

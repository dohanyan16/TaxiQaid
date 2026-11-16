// Review-only deterministic policy generation. No network, database or secret access.
const fs=require('node:fs'),crypto=require('node:crypto'),catalog=require('../shared/permission-catalog.js');
const file='supabase/review/user-management/01_admin.sql',source=fs.readFileSync(file,'utf8'),policy=JSON.stringify(Object.fromEntries(catalog.ALL.map(p=>[p.key,{requires:p.requires,audience:p.audience}])));
const body='-- BEGIN GENERATED CAPABILITY POLICY\nCREATE FUNCTION taxiqaid_auth_api.admin_catalog() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $policy$ SELECT '+"'"+policy.replaceAll("'","''")+"'::jsonb $policy$;\n-- END GENERATED CAPABILITY POLICY";
const expected=source.replace(/-- BEGIN GENERATED CAPABILITY POLICY[\s\S]*?-- END GENERATED CAPABILITY POLICY/,body);if(process.argv.includes('--check')){if(source!==expected)throw new Error('Administrative dependency policy drift.');}else fs.writeFileSync(file,expected);
console.log('PASS: canonical 107-capability administrative SQL policy '+crypto.createHash('sha256').update(policy).digest('hex'));
const legacy=fs.readFileSync('supabase/review/username-broker/02_functions.sql','utf8'),definition=legacy.match(/CREATE FUNCTION taxiqaid_auth_api\.get_management_access\(p_uid uuid,p_mapping_revision bigint\)[\s\S]*?\nEND \$\$;/)?.[0];
if(!definition)throw new Error('Reviewed access function not found.');const old=definition.slice(definition.indexOf('AS $$')+5,-3),updated=definition.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace("'financial','hr'","'financial','fleet','hr'");if(updated===definition)throw new Error('Access department policy not found.');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),hashes=[sha(old),sha(old.replaceAll('\n','\r\n'))];
const access=`-- PROPOSAL ONLY. Exact known access body, plus Fleet; preserve signatures, owners, ACL and existing memberships.\nBEGIN;\nSET LOCAL lock_timeout='3s';\nDO $$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'Ordinary Dashboard postgres required';END IF;
 IF NOT EXISTS(SELECT FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure AND proowner='taxiqaid_auth_access_owner'::regrole AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp','row_security=on'] AND cardinality(proconfig)=2 AND encode(sha256(convert_to(prosrc,'UTF8')),'hex') IN (${hashes.map(x=>"'"+x+"'").join(',')})) THEN RAISE EXCEPTION 'ACCESS_SOURCE_REVIEW_REQUIRED: do not replace an unverified live body';END IF;
 IF has_schema_privilege('taxiqaid_auth_access_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Unexpected existing CREATE privilege';END IF;
END $$;
CREATE TEMP TABLE access_memberships ON COMMIT DROP AS SELECT * FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole;
CREATE TEMP TABLE access_security ON COMMIT DROP AS SELECT proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure;
GRANT taxiqaid_auth_access_owner TO postgres WITH INHERIT FALSE,SET TRUE;
GRANT CREATE ON SCHEMA taxiqaid_auth_api TO taxiqaid_auth_access_owner;
SET LOCAL ROLE taxiqaid_auth_access_owner;
${updated}
SET LOCAL ROLE postgres;
REVOKE CREATE ON SCHEMA taxiqaid_auth_api FROM taxiqaid_auth_access_owner;
DO $$ DECLARE original record; BEGIN
 SELECT * INTO original FROM access_memberships WHERE member='postgres'::regrole AND grantor='postgres'::regrole;
 IF FOUND THEN EXECUTE format('GRANT taxiqaid_auth_access_owner TO postgres WITH ADMIN %s,INHERIT %s,SET %s GRANTED BY postgres',original.admin_option,original.inherit_option,original.set_option);ELSE REVOKE taxiqaid_auth_access_owner FROM postgres GRANTED BY postgres RESTRICT;END IF;
 IF EXISTS((SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM access_memberships) UNION ALL (SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM access_memberships EXCEPT SELECT roleid,member,grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='taxiqaid_auth_access_owner'::regrole)) THEN RAISE EXCEPTION 'Membership cleanup failed';END IF;
 IF EXISTS((SELECT proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid='taxiqaid_auth_api.get_management_access(uuid,bigint)'::regprocedure EXCEPT SELECT * FROM access_security)) OR has_schema_privilege('taxiqaid_auth_access_owner','taxiqaid_auth_api','CREATE') THEN RAISE EXCEPTION 'Access hardening/ACL changed';END IF;
END $$;
COMMIT;\n`;
const accessFile='supabase/review/user-management/03_access_compatibility.sql';if(process.argv.includes('--check')){if(fs.readFileSync(accessFile,'utf8')!==access)throw new Error('Access upgrade drift.');}else fs.writeFileSync(accessFile,access);

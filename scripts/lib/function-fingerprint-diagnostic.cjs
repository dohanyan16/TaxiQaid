// Generates a catalog-only diagnostic. It never calls the inspected functions or reads private tables.
const {sourceFingerprints}=require('./sql-source-fingerprints.cjs');
function generate({output,secure,quote,definitions,rate}){
 const specs=[rate,...definitions];
 const variants=spec=>[
  ...sourceFingerprints(spec.fixed.src).map(value=>({reference:spec===rate?'REVIEWED_20_10_10':'CORRECTED_64_CHARACTER_WATERMARK',line_endings:value.lineEndings,sha256:value.hash})),
  ...(spec.old?sourceFingerprints(spec.old.src).map(value=>({reference:'LEGACY_65_CHARACTER_WATERMARK',line_endings:value.lineEndings,sha256:value.hash})):[])
 ];
 const rows=specs.map(spec=>'('+[spec.signature,spec.fixed.args,spec.fixed.result,spec.fixed.language,JSON.stringify(variants(spec))].map(quote).join(',')+'::jsonb)').join(',\n ');
 const security=specs.map(spec=>`WHEN ${quote(spec.signature)} THEN ${secure(spec)}`).join('\n ');
 output('supabase/review/public-login/07_inspect_function_fingerprints.sql',`-- READ ONLY. Catalog-only source hashes/structure; no source text, identities, private rows or logs.
-- Run as the existing Dashboard administrator. Keep Cron/login disabled. Do not run SQL 00/01/04/06.
-- Expected variants are computed from reviewed repository bodies, never copied from live observations.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
-- BEGIN READ-ONLY FINGERPRINT QUERY
WITH targets(signature,expected_arguments,expected_result,expected_language,reviewed_variants) AS (VALUES
 ${rows}
), inspected AS (
 SELECT t.*,p.oid,p.prosrc,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') AS raw_prosrc_sha256,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex') AS full_definition_sha256,
 CASE WHEN p.oid IS NOT NULL AND pg_catalog.pg_get_function_arguments(p.oid)=t.expected_arguments
 AND pg_catalog.pg_get_function_result(p.oid)=t.expected_result AND l.lanname=t.expected_language
 AND p.prokind='f' AND p.provolatile='v' AND p.proparallel='u' AND NOT p.proisstrict AND NOT p.proleakproof AND p.prosupport=0 AND p.procost=100 AND p.prorows=CASE WHEN t.expected_result LIKE 'TABLE(%' THEN 1000 ELSE 0 END
 THEN 'PASS' ELSE 'FAIL' END AS interface_review,
 CASE WHEN CASE t.signature ${security} ELSE false END THEN 'PASS' ELSE 'FAIL' END AS security_review
 FROM targets t LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(t.signature)
 LEFT JOIN pg_catalog.pg_language l ON l.oid=p.prolang
), matched AS (
 SELECT i.*,(SELECT pg_catalog.jsonb_agg(v ORDER BY v->>'reference',v->>'line_endings')
 FROM pg_catalog.jsonb_array_elements(i.reviewed_variants) v WHERE v->>'sha256'=i.raw_prosrc_sha256) AS matched_references
 FROM inspected i
)
SELECT signature,pg_catalog.current_setting('server_version_num')::integer AS server_version_num,
 CASE WHEN oid IS NULL THEN 'MISSING' WHEN matched_references IS NULL THEN 'UNREVIEWED_BODY' ELSE 'EXACT_REVIEWED_BYTES' END AS body_review,
 raw_prosrc_sha256,full_definition_sha256,matched_references,reviewed_variants,
 pg_catalog.length(prosrc) AS source_characters,
 pg_catalog.octet_length(pg_catalog.convert_to(prosrc,'UTF8')) AS source_utf8_bytes,
 pg_catalog.length(prosrc)-pg_catalog.length(pg_catalog.replace(prosrc,pg_catalog.chr(10),'')) AS lf_characters,
 (pg_catalog.length(prosrc)-pg_catalog.length(pg_catalog.replace(prosrc,pg_catalog.chr(13)||pg_catalog.chr(10),'')))/2 AS crlf_pairs,
 pg_catalog.length(prosrc)-pg_catalog.length(pg_catalog.replace(prosrc,pg_catalog.chr(13),''))-
 (pg_catalog.length(prosrc)-pg_catalog.length(pg_catalog.replace(prosrc,pg_catalog.chr(13)||pg_catalog.chr(10),'')))/2 AS lone_cr_characters,
 pg_catalog.length(prosrc)-pg_catalog.length(pg_catalog.replace(prosrc,pg_catalog.chr(9),'')) AS tab_characters,
 interface_review,security_review,
 CASE WHEN signature=${quote(rate.signature)} THEN
 CASE WHEN matched_references IS NOT NULL AND interface_review='PASS' AND security_review='PASS' THEN 'CONFIRMED_20_10_10_WINDOWS_60_60_900' ELSE 'NOT_CONFIRMED' END
 ELSE 'NOT_APPLICABLE' END AS rate_policy_review
FROM matched ORDER BY signature;
-- END READ-ONLY FINGERPRINT QUERY
ROLLBACK;
`);
}
module.exports={generate};

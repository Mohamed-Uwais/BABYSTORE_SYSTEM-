"""Bootstrap an EMPTY independent staging database with schema only."""
from pathlib import Path
import json
import subprocess
import sys

root=Path(sys.argv[1]).resolve()
runtime=root/'.staging'
meta=json.loads((runtime/'instance.json').read_text(encoding='utf-8'))
if meta['database']!='littora_phase1_staging' or meta['port']!=13307 or meta['host']!='127.0.0.1':
    raise SystemExit('Unexpected staging identity; refusing changes.')
client=Path('C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe')
args=[str(client),'--defaults-extra-file='+str(runtime/'mysql-client.cnf'),'--batch','--skip-column-names',meta['database']]
def query(sql):
    r=subprocess.run(args,input=sql,text=True,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=60)
    if r.returncode: raise SystemExit('Staging SQL failed: '+r.stderr)
    return r.stdout.strip()
identity=query('SELECT @@port, DATABASE(), @@datadir;').split('\t')
if identity[0]!='13307' or identity[1]!=meta['database'] or Path(identity[2]).resolve()!=Path(meta['data_directory']).resolve():
    raise SystemExit('Server does not match isolated staging metadata.')
if query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();')!='0':
    raise SystemExit('Database is not empty; refusing to replay the bootstrap schema.')
schema=(root/'database/babystore_schema.sql').read_text(encoding='utf-8').split('INSERT INTO couriers')[0]
if 'INSERT INTO' in schema.upper() or 'CREATE DATABASE' in schema.upper() or '\nUSE ' in schema.upper():
    raise SystemExit('Unexpected data/database statements in schema bootstrap.')
query(schema)
for name in ['017_checkout_requests.sql','018_website_studio.sql']:
    query((root/'database/migrations'/name).read_text(encoding='utf-8'))
    query("INSERT INTO schema_migrations (filename) VALUES ('"+name+"');")
meta['schema_imported']=True
meta['schema_source']='repository canonical DDL; no seeds; migrations 017 and 018'
(runtime/'instance.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print('Schema-only bootstrap complete in isolated staging. No production data, seed accounts or integration credentials imported.')
print('Historic migration/schema mapping still needs verification before application workflow testing.')

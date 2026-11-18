"""Create an independent, loopback-only MySQL instance; never uses project .env.

Run with the explicit isolated worktree path. Credentials stay in ignored local
files. This script deliberately does not import any existing project SQL/data.
"""
from pathlib import Path
import json
import secrets
import socket
import subprocess
import sys
import time

root = Path(sys.argv[1]).resolve()
if root.name != 'BABYSTORE-POS' or 'littora-phase1' not in root.parts:
    raise SystemExit('Expected the isolated littora-phase1 worktree.')
runtime = root / '.staging'
data = runtime / 'mysql-data'
mysql_home = Path('C:/Program Files/MySQL/MySQL Server 8.0')
server = mysql_home / 'bin/mysqld.exe'
client = mysql_home / 'bin/mysql.exe'
port = 13307
database = 'littora_phase1_staging'
if (runtime / 'instance.json').exists() or data.exists():
    raise SystemExit('Staging files already exist; inspect them before starting or reinitialising. No changes made.')
with socket.socket() as check:
    if check.connect_ex(('127.0.0.1', port)) == 0:
        raise SystemExit('Staging port is occupied. Refusing to connect to an unidentified instance.')
runtime.mkdir(parents=True, exist_ok=True)
ignore = root / '.gitignore'
with ignore.open('a', encoding='utf-8') as stream:
    stream.write('\n# Isolated local staging data and credentials\n.staging/\n')
password = secrets.token_hex(24)
root_password = secrets.token_hex(24)
flags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
def run(args, **kwargs):
    return subprocess.run([str(x) for x in args], creationflags=flags, capture_output=True, text=True, **kwargs)
result = run([server, '--no-defaults', '--initialize-insecure', '--basedir='+str(mysql_home), '--datadir='+str(data)], timeout=180)
if result.returncode:
    raise SystemExit('Independent MySQL initialisation failed. Inspect .staging/mysql-data/*.err; no live server was contacted.')
init = runtime / 'initialise.sql'
init.write_text(
    "ALTER USER 'root'@'localhost' IDENTIFIED BY '"+root_password+"';\n"
    + 'CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n'
    + "CREATE USER 'littora_staging'@'127.0.0.1' IDENTIFIED BY '"+password+"';\n"
    + "GRANT ALL PRIVILEGES ON "+database+".* TO 'littora_staging'@'127.0.0.1';\n", encoding='utf-8')
(runtime / 'backend.env').write_text(
    'APP_ENV=staging\nNODE_ENV=development\nDB_HOST=127.0.0.1\nDB_PORT=13307\nDB_NAME='+database
    +'\nDB_USER=littora_staging\nDB_PASSWORD='+password+'\nJWT_SECRET='+secrets.token_hex(48)
    +'\nPORT=15001\nPUBLIC_URL=http://127.0.0.1:15174\nWEBSITE_STUDIO_ENABLED=false\nEXTERNAL_INTEGRATIONS_ENABLED=false\n', encoding='utf-8')
(runtime / 'mysql-client.cnf').write_text('[client]\nuser=littora_staging\npassword='+password+'\nhost=127.0.0.1\nport=13307\nprotocol=TCP\n', encoding='utf-8')
(runtime / 'mysql-root.cnf').write_text('[client]\nuser=root\npassword='+root_password+'\nhost=127.0.0.1\nport=13307\nprotocol=TCP\n', encoding='utf-8')
log = runtime / 'mysql.err'
process = subprocess.Popen([str(server),'--no-defaults','--basedir='+str(mysql_home),'--datadir='+str(data),
    '--bind-address=127.0.0.1','--port=13307','--mysqlx=OFF','--skip-name-resolve','--skip-log-bin',
    '--local-infile=OFF','--secure-file-priv=NULL','--log-error='+str(log),'--init-file='+str(init)],
    creationflags=flags, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
metadata = {'pid':process.pid,'port':port,'host':'127.0.0.1','database':database,'data_directory':str(data),'status':'starting','schema_imported':False,'app_started':False}
(runtime / 'instance.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
for attempt in range(45):
    result = run([client,'--defaults-extra-file='+str(runtime/'mysql-client.cnf'),'--batch','--skip-column-names',
                  '-e','SELECT @@port, DATABASE(); SHOW GRANTS FOR CURRENT_USER();',database], timeout=5)
    if result.returncode == 0:
        if not result.stdout.startswith('13307\t'+database):
            raise SystemExit('Unexpected server identity. Do not proceed.')
        metadata['status']='ready'; metadata['verified_database_scope']=True
        (runtime/'instance.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
        # Remove transient SQL holding generated passwords once startup finishes.
        init.unlink()
        print('Independent staging MySQL ready: 127.0.0.1:13307 / '+database)
        print('App user has privileges on this test database only. Credentials saved to ignored .staging files; not printed.')
        print('No schema/customer/order/stock data imported. Backend, storefront, POS and integrations are not running.')
        break
    if process.poll() is not None:
        raise SystemExit('Independent MySQL process exited; inspect the local .staging/mysql.err file.')
    time.sleep(1)
else:
    raise SystemExit('Staging readiness not confirmed. Inspect local logs before proceeding; no app started.')

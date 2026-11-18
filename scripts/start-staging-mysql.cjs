// Restart the existing isolated instance; never initialise or migrate data.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const runtime = path.resolve(__dirname, '../.staging');
const meta = JSON.parse(fs.readFileSync(path.join(runtime, 'instance.json'), 'utf8'));
const data = path.join(runtime, 'mysql-data');
assert.equal(meta.host, '127.0.0.1');
assert.equal(meta.port, 13307);
assert.equal(meta.database, 'littora_phase1_staging');
assert.equal(path.resolve(meta.data_directory), data);
assert.ok(fs.existsSync(path.join(data, 'auto.cnf')), 'Existing initialized instance required');
const home = 'C:/Program Files/MySQL/MySQL Server 8.0';
const socket = net.connect({ host: meta.host, port: meta.port });
socket.once('connect', () => {
  socket.destroy();
  console.error('Port 13307 is already occupied. Verify identity with snapshot-staging-schema.cjs.');
  process.exitCode = 1;
});
socket.once('error', error => {
  if (error.code !== 'ECONNREFUSED') throw error;
  const child = spawn(path.join(home, 'bin/mysqld.exe'), [
    '--no-defaults', `--basedir=${home}`, `--datadir=${data}`,
    '--bind-address=127.0.0.1', '--port=13307', '--mysqlx=OFF',
    '--skip-name-resolve', '--skip-log-bin', '--local-infile=OFF',
    '--secure-file-priv=NULL', `--log-error=${path.join(runtime, 'mysql.err')}`,
  ], { windowsHide: true, stdio: 'ignore' });
  child.once('error', () => { console.error('Unable to start isolated MySQL'); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code || 0; });
  console.log('Starting existing localhost test database. Verify its identity before application startup.');
});

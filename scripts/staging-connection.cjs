const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
async function connect() {
  const runtime = path.join(root,'.staging');
  const metadata = JSON.parse(fs.readFileSync(path.join(runtime,'instance.json'),'utf8'));
  const env = require('../backend/node_modules/dotenv').parse(fs.readFileSync(path.join(runtime,'backend.env')));
  assert.equal(env.APP_ENV,'staging');
  assert.equal(env.DB_HOST,'127.0.0.1');
  assert.equal(env.DB_PORT,'13307');
  assert.equal(env.DB_NAME,'littora_phase1_staging');
  assert.equal(path.resolve(metadata.data_directory),path.join(runtime,'mysql-data'));
  const connection = await require('../backend/node_modules/mysql2/promise').createConnection({host:env.DB_HOST,port:13307,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,multipleStatements:false});
  try {
    const [[identity]] = await connection.query('SELECT DATABASE() AS db, @@port AS port, @@datadir AS directory');
    assert.equal(identity.db,env.DB_NAME);assert.equal(Number(identity.port),13307);
    assert.equal(path.resolve(identity.directory),path.resolve(metadata.data_directory));
    return connection;
  } catch(error) {await connection.end();throw error;}
}
module.exports = {connect};

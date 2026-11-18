// Explicit additive migration only, after checking live connection identity.
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
  const connection=await require('./staging-connection.cjs').connect();
  try {
    for(const filename of ['019_category_filters.sql','020_website_product_content.sql','021_website_reservations.sql']){
    const sql=fs.readFileSync(path.resolve(__dirname,'../database/migrations',filename),'utf8');
    for(const statement of sql.split(';').map(value=>value.trim()).filter(Boolean)) await connection.query(statement);
    await connection.query('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)',[filename]);
    }
    console.log('Applied additive category-filter migration to verified isolated test database.');
  } finally {await connection.end();}
})().catch(error=>{console.error('Staging migration failed:',error.code||error.message);process.exitCode=1;});

const decode=value=>typeof value==='string'?JSON.parse(value):value;
function createRepository(pool){
  async function published(db){
    const [rows]=await db.query('SELECT section_key, content FROM website_content ORDER BY section_key');
    return Object.fromEntries(rows.map(r=>[r.section_key,decode(r.content)]));
  }
  const state=row=>({document:decode(row.document),version:Number(row.version)});
  return {
    async readDraft(){
      const [[row]]=await pool.query('SELECT document, version FROM website_studio_draft WHERE id = 1');
      return row?state(row):{document:await published(pool),version:0};
    },
    async revisions(){
      const [rows]=await pool.query('SELECT id, source_version, action, created_by, created_at FROM website_studio_revisions ORDER BY id DESC LIMIT 100');
      return rows;
    },
    async transaction(operation){
      const db=await pool.getConnection();
      try{
        await db.beginTransaction();
        const result=await operation({
          async lockDraft(){
            // Serialize initialisation as well as subsequent saves. Existing content
            // is copied, not replaced with seed/demo values.
            await db.query('INSERT IGNORE INTO website_studio_draft (id, document, version) VALUES (1, ?, 0)',[JSON.stringify(await published(db))]);
            const [[row]]=await db.query('SELECT document, version FROM website_studio_draft WHERE id = 1 FOR UPDATE');
            return state(row);
          },
          async writeDraft(document,v,actor){
            await db.query('UPDATE website_studio_draft SET document = ?, version = ?, updated_by = ? WHERE id = 1',[JSON.stringify(document),v,actor||null]);
          },
          readPublished:()=>published(db),
          async publish(document){
            // Update existing section rows in one transaction. No product, order,
            // slug, inventory or customer records are rewritten.
            const keys=Object.keys(document);
            if(keys.length)await db.query('DELETE FROM website_content WHERE section_key NOT IN ('+keys.map(()=>'?').join(',')+')',keys);
            else await db.query('DELETE FROM website_content');
            for(const [key,content] of Object.entries(document))await db.query(
              'INSERT INTO website_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)',[key,JSON.stringify(content)]);
          },
          async addRevision(document,v,action,actor){
            await db.query('INSERT INTO website_studio_revisions (document, source_version, action, created_by) VALUES (?, ?, ?, ?)',[JSON.stringify(document),v,action,actor||null]);
          },
          async getRevision(id){
            const [[row]]=await db.query('SELECT document FROM website_studio_revisions WHERE id = ?',[id]);
            return row?{document:decode(row.document)}:null;
          }
        });
        await db.commit();return result;
      }catch(error){await db.rollback();throw error;}finally{db.release();}
    }
  };
}
module.exports={createRepository};

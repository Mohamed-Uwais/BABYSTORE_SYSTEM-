// Use only after staging-connection has verified the actual DB identity.
const {randomUUID}=require('node:crypto');
async function create(db){
  const username=`test_${randomUUID().slice(0,8)}`,password=randomUUID();
  const hash=await require('../backend/node_modules/bcrypt').hash(password,10);
  const [result]=await db.query("INSERT INTO users (username,password_hash,full_name,role,is_active) VALUES (?,?,?,'owner',1)",[username,hash,'Disposable integration test']);
  return {id:result.insertId,username,password};
}
module.exports={create};

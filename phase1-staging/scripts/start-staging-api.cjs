// Never run the regular npm start with production environment files for staging.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const backend=path.join(root,'backend');
const runtime=path.join(root,'.staging');
const instance=JSON.parse(fs.readFileSync(path.join(runtime,'instance.json'),'utf8'));
if(!instance.schema_imported||instance.database!=='littora_phase1_staging'||instance.port!==13307)throw Error('Verified staging schema is required');
if(fs.existsSync(path.join(backend,'.env')))throw Error('Remove/review backend/.env before staging startup; only .staging/backend.env may be loaded');
const env={};
for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ComSpec'])if(process.env[key])env[key]=process.env[key];
for(const line of fs.readFileSync(path.join(runtime,'backend.env'),'utf8').split(/\r?\n/)){
 const i=line.indexOf('=');if(i>0)env[line.slice(0,i)]=line.slice(i+1);
}
if(env.APP_ENV!=='staging'||env.PORT!=='15001'||env.DB_NAME!==instance.database||env.DB_PORT!=='13307'||env.DB_HOST!=='127.0.0.1')throw Error('Unexpected staging configuration');
// No inherited WhatsApp/courier/payment/AI credentials or NODE_OPTIONS.
const child=spawn(process.execPath,['--require',path.join(__dirname,'staging-network-guard.cjs'),'src/server.js'],{cwd:backend,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error('Staging API startup failed:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});

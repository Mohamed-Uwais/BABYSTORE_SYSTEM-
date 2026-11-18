// Isolated local frontend launcher. No production environment files are loaded.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const folder={website:'website',pos:'frontend'}[process.argv[2]];
if(!folder)throw Error('Use: node scripts/start-local-frontend.cjs website|pos');
const cwd=path.join(root,folder);
if(fs.readdirSync(cwd).some(name=>/^\.env(?:\.|$)/.test(name)))throw Error('Review/remove frontend environment files before isolated local startup');
if(!fs.existsSync(path.join(root,'.staging/localhost-prepared.json')))throw Error('Prepare the isolated test database first');
const env={APP_ENV:'staging'};
for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ComSpec'])if(process.env[key])env[key]=process.env[key];
const child=spawn(process.execPath,[path.join(cwd,'node_modules/vite/bin/vite.js')],{cwd,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error('Local frontend failed:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});

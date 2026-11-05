import {strict as assert} from 'node:assert';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ticketExports={};
const ticketCode=ts.transpileModule(readFileSync('lib/upload-ticket.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','exports',ticketCode)(name=>name==='server-only'?{}:require(name),ticketExports);
process.env.UPLOAD_TOKEN_SECRET='synthetic-upload-test-secret-'.repeat(2);
const transpile=file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const helpers=await import('data:text/javascript;base64,'+Buffer.from(transpile('lib/resume.ts')).toString('base64'));
const code=transpile('app/api/apply/route.ts').replace(/^import .*;\s*$/gm,'').replace('export async function POST','async function POST');
let stored=[],saved=[],removed=[];let failSave=false;
const env={BUCKET:{put:async(k,v)=>stored.push({k,v}),delete:async k=>removed.push(k)}};
const getDb=()=>({insert:()=>({values:async x=>{if(failSave)throw Error('Database unavailable');saved.push(x)}})});
const POST=new Function('sameOrigin','bucket','getDb','applications','createHash','verifyUpload',...Object.keys(helpers),code+';return POST')(req=>req.headers.get('origin')===new URL(req.url).origin,env.BUCKET,getDb,{},createHash,ticketExports.verifyUpload,...Object.values(helpers));
function form(file){const f=new FormData();for(const [k,v] of Object.entries({name:'Fixture applicant',email:'fixture@example.com',country:'Pakistan',role:'Virtual assistance',availability:'10–20 hours',experience:'A synthetic test profile',consent:'yes'}))f.set(k,v);if(file)f.set('resume',file);return f}
const request=f=>new Request('https://example.test/api/apply',{method:'POST',headers:{Origin:'https://example.test'},body:f});
let r=await POST(request(form()));assert.equal(r.status,400);assert.equal(stored.length,0);assert.equal(saved.length,0);
r=await POST(request(form(new File(['not a PDF'],'fake.pdf'))));assert.equal(r.status,400);assert.equal(stored.length,0);
r=await POST(request(form(new File(['%PDF-1.4\nSynthetic test file'],'fixture.pdf',{type:'application/pdf'}))));assert.equal(r.status,201);assert.equal(stored.length,1);assert.equal(saved.length,1);assert.equal(saved[0].resumeKey,stored[0].k);assert.equal(saved[0].resumeName,'fixture.pdf');assert.equal(saved[0].email,'fixture@example.com');assert.ok((await r.json()).reference);
failSave=true;r=await POST(request(form(new File(['%PDF-1.4\nSynthetic file'],'fixture.pdf'))));assert.equal(r.status,500);assert.equal(removed.length,1);
failSave=false;
// Exercise the Vercel flow: a 5 MB object goes through private Storage, while the form stays small.
const bytes=new Uint8Array(5*1024*1024);bytes.set(new TextEncoder().encode('%PDF-1.4\n'));
const ticket={id:crypto.randomUUID(),key:'pending-resumes/fixture',name:'large.pdf',size:bytes.length,checksum:createHash('sha256').update(bytes).digest('base64'),expires:Date.now()+60000};
env.BUCKET.get=async()=>({size:bytes.length,body:{transformToByteArray:async()=>bytes}});
const signedForm=()=>{const f=form();f.set('resumeTicket',ticketExports.signUpload(ticket));return f;};
r=await POST(request(signedForm()));assert.equal(r.status,201);assert.equal(saved.at(-1).resumeSize,String(bytes.length));assert.ok(saved.at(-1).resumeKey.startsWith('resumes/'+ticket.id+'/'));
bytes[20]=1;r=await POST(request(signedForm()));assert.equal(r.status,400);bytes[20]=0;
ticket.expires=Date.now()-1;assert.throws(()=>ticketExports.verifyUpload(ticketExports.signUpload(ticket)),/expired/);
const signed=ticketExports.signUpload({...ticket,expires:Date.now()+60000});assert.throws(()=>ticketExports.verifyUpload(signed.slice(0,-1)+(signed.endsWith('a')?'b':'a')),/Invalid/);
r=await POST(new Request('https://example.test/api/apply',{method:'POST',headers:{Origin:'https://other.test'},body:form()}));assert.equal(r.status,403);
const f=form(new File(['%PDF-1.4'],'fixture.pdf'));f.delete('consent');r=await POST(request(f));assert.equal(r.status,400);
const downloadCode=transpile('app/api/resume/route.ts').replace(/^import .*;\s*$/gm,'').replace('export async function GET','async function GET');
for(const role of [null,{admin:false}]){const GET=new Function('downloadUrl','portalActor','getDb','applications','eq','safeResumeName',downloadCode+';return GET')(()=>{throw Error('Protected storage must not be read')},async()=>role,()=>{throw Error('Protected database must not be read')},{},()=>{},helpers.safeResumeName);const result=await GET(new Request('https://example.test/api/resume?id=fixture'));assert.equal(result.status,403)}
console.log('Application flow checks passed: mandatory CV, invalid file rejection, matching file/record storage, cleanup, consent, origin and anonymous/employee download denial. All dependencies are isolated test doubles; no network or identity headers used.');

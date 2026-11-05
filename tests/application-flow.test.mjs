import {strict as assert} from 'node:assert';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const transpile=file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const helpers=await import('data:text/javascript;base64,'+Buffer.from(transpile('lib/resume.ts')).toString('base64'));
const code=transpile('app/api/apply/route.ts').replace(/^import .*;\s*$/gm,'').replace('export async function POST','async function POST');
let stored=[],saved=[],removed=[];let failSave=false;
const env={BUCKET:{put:async(k,v)=>stored.push({k,v}),delete:async k=>removed.push(k)}};
const getDb=()=>({insert:()=>({values:async x=>{if(failSave)throw Error('Database unavailable');saved.push(x)}})});
const POST=new Function('env','getDb','applications',...Object.keys(helpers),code+';return POST')(env,getDb,{},...Object.values(helpers));
function form(file){const f=new FormData();for(const [k,v] of Object.entries({name:'Fixture applicant',email:'fixture@example.com',country:'Pakistan',role:'Virtual assistance',availability:'10–20 hours',experience:'A synthetic test profile',consent:'yes'}))f.set(k,v);if(file)f.set('resume',file);return f}
const request=f=>new Request('https://example.test/api/apply',{method:'POST',headers:{Origin:'https://example.test'},body:f});
let r=await POST(request(form()));assert.equal(r.status,400);assert.equal(stored.length,0);assert.equal(saved.length,0);
r=await POST(request(form(new File(['not a PDF'],'fake.pdf'))));assert.equal(r.status,400);assert.equal(stored.length,0);
r=await POST(request(form(new File(['%PDF-1.4\nSynthetic test file'],'fixture.pdf',{type:'application/pdf'}))));assert.equal(r.status,201);assert.equal(stored.length,1);assert.equal(saved.length,1);assert.equal(saved[0].resumeKey,stored[0].k);assert.equal(saved[0].resumeName,'fixture.pdf');assert.equal(saved[0].email,'fixture@example.com');assert.ok((await r.json()).reference);
failSave=true;r=await POST(request(form(new File(['%PDF-1.4\nSynthetic file'],'fixture.pdf'))));assert.equal(r.status,500);assert.equal(removed.length,1);
r=await POST(new Request('https://example.test/api/apply',{method:'POST',headers:{Origin:'https://other.test'},body:form()}));assert.equal(r.status,403);
const f=form(new File(['%PDF-1.4'],'fixture.pdf'));f.delete('consent');r=await POST(request(f));assert.equal(r.status,400);
const downloadCode=transpile('app/api/resume/route.ts').replace(/^import .*;\s*$/gm,'').replace('export async function GET','async function GET');
for(const role of [null,{admin:false}]){const GET=new Function('env','portalActor','getDb','applications','eq','safeResumeName',downloadCode+';return GET')(env,async()=>role,()=>{throw Error('Protected database must not be read')},{},()=>{},helpers.safeResumeName);const result=await GET(new Request('https://example.test/api/resume?id=fixture'));assert.equal(result.status,403)}
console.log('Application flow checks passed: mandatory CV, invalid file rejection, matching file/record storage, cleanup, consent, origin and anonymous/employee download denial. All dependencies are isolated test doubles; no network or identity headers used.');

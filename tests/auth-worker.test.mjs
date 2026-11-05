import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const script=ts.transpileModule(readFileSync('lib/password.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText+`
export default {async fetch(){const password='worker-runtime-fixture-713';const h=await hashPassword(password);return Response.json({valid:await verifyPassword(password,h),invalid:await verifyPassword('wrong',h),salted:h.startsWith('scrypt$32768$8$3$')});}};
`;
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat']});
try{const r=await mf.dispatchFetch('http://localhost/');const j=await r.json();if(!j.valid||j.invalid||!j.salted)throw Error(JSON.stringify(j));console.log('Cloudflare workerd runtime: scrypt hashing and verification passed.');}finally{await mf.dispose();}

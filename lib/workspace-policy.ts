export function canUseEmployeeRecord(actor:{admin:boolean;memberId:string},memberId:string){return actor.admin||actor.memberId===memberId}
export function validWorkUrl(value:unknown){if(typeof value!=='string'||value.length>1500)return false;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}}
export function cleanFocusIds(value:string){try{const x=JSON.parse(value);return Array.isArray(x)?x.filter((v:unknown)=>typeof v==='string').slice(0,30):[]}catch{return []}}

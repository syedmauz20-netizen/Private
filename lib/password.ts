import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
export function validPassword(v: unknown): v is string { return typeof v==='string' && v.length>=12 && v.length<=128; }
function derive(p:string,s:string):Promise<Buffer>{return new Promise((resolve,reject)=>scrypt(p,s,64,{N:32768,r:8,p:3,maxmem:67108864},(e,k)=>e?reject(e):resolve(k)));}
export async function hashPassword(p:string){const s=randomBytes(16).toString('hex');return `scrypt$32768$8$3$${s}$${(await derive(p,s)).toString('hex')}`;}
export async function verifyPassword(p:string,h:string){const a=h.split('$');if(a.length!==6||a.slice(0,4).join('$')!=='scrypt$32768$8$3'||!/^[a-f0-9]{32}$/.test(a[4])||!/^[a-f0-9]{128}$/.test(a[5]))return false;return timingSafeEqual(await derive(p,a[4]),Buffer.from(a[5],'hex'));}

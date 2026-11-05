import {session,OWNER} from './session';
export {OWNER};
export async function portalActor(){const a=await session();if(!a||a.must_change_password)return null;return {userId:a.id,email:a.email,displayName:a.name||'Administrator',admin:a.role==='admin'&&a.email===OWNER,memberId:a.member_id||''};}

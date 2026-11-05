import AuthForm from '../auth-form';
import {adminExists,session,OWNER} from '../../lib/session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){
  if(await adminExists()){
    const account=await session();
    redirect(account?.role==='admin'&&account.email===OWNER?'/dashboard':'/login');
  }
  return <AuthForm mode="setup"/>;
}

import {session} from '../../lib/session';
import {redirect} from 'next/navigation';
import Portal from './portal';
export const dynamic='force-dynamic';
export const metadata={title:'Team workspace | RemoteWorkNest'};
export default async function Page(){const a=await session();if(!a)redirect('/login');if(a.must_change_password)redirect('/change-password');return <Portal/>}

import Dashboard from './ui';
import Marketing from './marketing';
import {auth} from '../lib/auth';
export const dynamic='force-dynamic';
export default async function Page(){const {data:session}=await auth.getSession();return session?.user?<Dashboard/>:<Marketing/>}

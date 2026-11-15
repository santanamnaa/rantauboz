import {auth} from '../../lib/auth';
import {getCommunitySettings,isContributionManager} from '../../lib/community-service';
import {pageMetadata} from '../../lib/site-metadata';
import CommunityPage from '../community-page';
export const dynamic='force-dynamic';
export const viewport={themeColor:'#193f9b'};
export const metadata=pageMetadata('community','/ikut-rawat');
export default async function Page(){const [session,settings]=await Promise.all([auth.getSession().catch(()=>({data:null})),getCommunitySettings().catch(()=>({url:null,unavailable:true}))]);const manager=await isContributionManager(session.data?.user.id).catch(()=>false);return <CommunityPage supportUrl={settings.url} supportUnavailable={'unavailable' in settings} canManage={manager}/>}

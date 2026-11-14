import {auth} from './lib/auth';
export default auth.middleware({loginUrl:'/auth/sign-in',publicRoutes:['/api/data','/api/mutate']});
export const config={matcher:['/((?!_next/static|_next/image|assets|manifest.webmanifest|favicon.ico).*)']};

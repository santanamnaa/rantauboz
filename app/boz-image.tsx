'use client';
const poses:Record<string,[number,number,number]>={food:[1,0,0],transport:[1,1,0],leisure:[1,0,1],shopping:[1,1,1],home:[2,0,0],glass:[2,1,0],education:[2,0,1],health:[2,1,1],bills:[3,0,0],travel:[3,1,0],gifts:[3,0,1],savings:[3,1,1]};
const blank='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="384" height="384"/%3E';
// Four transparent poses per optimized atlas; no white backing or extra image requests.
export default function BozImage({pose='glass',className='',alt=''}:{pose?:string;className?:string;alt?:string}){const key=Object.hasOwn(poses,pose)?pose:'glass',[sheet,x,y]=poses[key];return <img src={blank} className={className+' boz-cutout'} alt={alt} data-boz-pose={key} draggable={false} style={{backgroundImage:'url("/assets/boz-cutouts-'+sheet+'.webp")',backgroundSize:'200% 200%',backgroundPosition:x*100+'% '+y*100+'%',backgroundRepeat:'no-repeat',backgroundColor:'transparent',border:0,borderRadius:0,padding:0,boxShadow:'none'}}/>}

import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';

function bucket(){const b=(env as unknown as {PHOTOS?:R2Bucket}).PHOTOS;if(!b)throw new Error('Photo storage unavailable');return b}
const safeKey=(userId:string,key:string)=>key.startsWith(userId+'/')&&/^[A-Za-z0-9_\-./]+$/.test(key);

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to upload a photo.'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
  try{const form=await request.formData();const file=form.get('photo');if(!(file instanceof File))return Response.json({error:'Choose a photo.'},{status:400});
    if(file.size>8*1024*1024)return Response.json({error:'Photo must be smaller than 8 MB.'},{status:400});
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return Response.json({error:'Use a JPG, PNG or WebP photo.'},{status:400});
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const key=user.userId+'/'+crypto.randomUUID()+'.'+ext;
    await bucket().put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type},customMetadata:{owner:user.userId}});
    return Response.json({key});
  }catch(e){console.error(e);return Response.json({error:'Photo upload failed. Please try again.'},{status:503})}
}

export async function GET(request:Request){
  const user=await getChatGPTUser();if(!user)return new Response('Sign in required',{status:401});
  const key=new URL(request.url).searchParams.get('key')||'';if(!safeKey(user.userId,key))return new Response('Not found',{status:404});
  const object=await bucket().get(key);if(!object)return new Response('Not found',{status:404});
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=3600'}});
}

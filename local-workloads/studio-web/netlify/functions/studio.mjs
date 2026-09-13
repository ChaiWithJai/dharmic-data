const MAX = 2 * 1024 * 1024;
const json = (detail, status) => new Response(JSON.stringify({detail}), {status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
export default async function handler(request, context) {
  const url = new URL(request.url);
  const upstream = Netlify.env.get('STUDIO_API_ORIGIN');
  const token = Netlify.env.get('STUDIO_GATEWAY_TOKEN');
  if (!upstream || !token) return json('The grants workspace is not connected yet.',503);
  if (!['GET','POST','PUT','DELETE'].includes(request.method) || !/^\/api\/[a-zA-Z0-9/_-]+$/.test(url.pathname) || url.search) return json('Unsupported request.',404);
  if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) return json('A same-origin request is required.',403);
  let body;
  if(request.method !== 'GET') {
    if (!(request.headers.get('content-type')||'').includes('application/json')) return json('Use JSON.',415);
    const chunks=[];let size=0;const reader=request.body?.getReader();
    if(reader) try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();return json('Request too large.',413);}chunks.push(value);}}finally{reader.releaseLock();}
    body=Buffer.concat(chunks);
  }
  try {
    const target=new URL(upstream);
    if(target.protocol!=='https:'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)return json('Invalid service configuration.',503);
    const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','Origin':url.origin,'X-Studio-Client-IP':context.ip||'unknown'};
    for(const key of ['cookie','x-workspace-id']) {const v=request.headers.get(key);if(v)headers[key]=v;}
    const response=await fetch(new URL(url.pathname,target),{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
    const output=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    for(const key of ['content-type','content-disposition']){const v=response.headers.get(key);if(v)output.set(key,v);}
    for(const cookie of response.headers.getSetCookie())output.append('Set-Cookie',cookie);
    return new Response(response.body,{status:response.status,headers:output});
  } catch {return json('Jai’s GB10 is temporarily unavailable. Saved work remains stored; please retry later.',503);}
}
export const config = {path:'/api/*'};

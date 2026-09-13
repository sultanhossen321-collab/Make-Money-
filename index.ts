import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"Content-Type":"application/json"}});

async function hmacKey(secret:string){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
}
async function hex(buf:ArrayBuffer){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function verify(initData:string, botToken:string){
  const p=new URLSearchParams(initData);const hash=p.get("hash");if(!hash)throw new Error("Missing Telegram hash");
  p.delete("hash");const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const secretBuf=await crypto.subtle.sign("HMAC",await hmacKey("WebAppData"),new TextEncoder().encode(botToken));
  const secretHex=hex(secretBuf);
  const key=await crypto.subtle.importKey("raw",new Uint8Array(secretHex.match(/.{2}/g)!.map(x=>parseInt(x,16))),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const calc=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data));
  if(hex(calc)!==hash)throw new Error("Invalid Telegram initData");
  const user=JSON.parse(p.get("user")||"{}");if(!user.id)throw new Error("Telegram user missing");
  return user;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const auth=req.headers.get("Authorization")||"";
    const token=auth.replace(/^Bearer\s+/i,"");
    if(!token) return json({error:"Missing auth"},401);
    const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, bot=Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    if(!key||!bot) return json({error:"Server secrets are not configured"},500);
    const admin=createClient(url,key);
    const u=await admin.auth.getUser(token);if(u.error||!u.data.user)return json({error:"Invalid session"},401);
    const body=await req.json();const tg=await verify(body.initData,bot);
    const ref=typeof body.ref==="string"?body.ref:null;
    const {data:existing}=await admin.from("profiles").select("*").eq("id",u.data.user.id).maybeSingle();
    const {data:byTg}=await admin.from("profiles").select("id").eq("telegram_id",String(tg.id)).maybeSingle();
    if(byTg && byTg.id!==u.data.user.id) return json({error:"Telegram account is already linked"},409);
    let referred_by=existing?.referred_by||null;
    if(!existing && ref){const r=await admin.from("profiles").select("id").eq("referral_code",ref).maybeSingle();referred_by=r.data?.id||null;}
    const payload={id:u.data.user.id,telegram_id:String(tg.id),username:tg.username||null,first_name:tg.first_name||null,last_name:tg.last_name||null,avatar_url:tg.photo_url||null,referred_by};
    const {data:profile,error}=await admin.from("profiles").upsert(payload,{onConflict:"id"}).select("*").single();
    if(error) return json({error:error.message},400);
    return json({profile});
  }catch(e){return json({error:String(e?.message||e)},400)}
});

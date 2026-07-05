const Vooloovee=(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORE='vooloovee-v29-supabase';
const OLD_STORE='veloura-v29-supabase';
const PROJECT_EMAIL='vooloovee@gmail.com';
const SUPABASE_URL='https://crbsftxtwrvanmbhlmip.supabase.co';
const SUPABASE_KEY='sb_publishable_CxwKl83msa70VO_fnO7BTw_dzFRyey9';
let supabaseClient=null, supabaseLoaded=false;
const db=()=>{try{if(!window.supabase)return null; if(!supabaseClient)supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY); return supabaseClient}catch(e){console.warn('Supabase not ready',e); return null}};
const cats=['Women','Men','Kids','Beauty','Home & Living','Footwear','Accessories'];
const brandLogin={username:'brand',password:'Brand@123',email:'vooloovee@gmail.com'};
function backendOrigin(){
  // Use the Node server for real emails. This prevents the Verify/Forgot buttons from
  // accidentally calling VS Code Live Server or a file:// page.
  if(location.protocol==='file:'||location.port&&location.port!=='3000')return 'http://localhost:3000';
  return location.origin||'http://localhost:3000';
}
function encodeLinkData(obj){try{return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))}catch(e){return ''}}
function decodeLinkData(raw){try{return JSON.parse(decodeURIComponent(escape(atob(String(raw||'')))))}catch(e){return null}}
function actionLink(type,email,token,user){let url=new URL('/index.html',backendOrigin()); if(type==='verify')url.searchParams.set('verify',email); else url.searchParams.set(type,email); url.searchParams.set('token',token); if(user)url.searchParams.set('data',encodeLinkData({id:user.id,username:user.username,password:user.password,tempPassword:user.pendingTempPassword||'',tempAfterVerify:!!user.tempAfterVerify,name:user.name,email:user.email,token})); return url.toString()}
const VERIFIED_EMAILS_STORE='vooloovee-verified-emails';
function verifiedEmails(){try{return JSON.parse(localStorage.getItem(VERIFIED_EMAILS_STORE)||'[]').map(x=>String(x).toLowerCase())}catch(e){return []}}
const DELETED_USERS_STORE='vooloovee-deleted-users';
function deletedUsers(){try{return JSON.parse(localStorage.getItem(DELETED_USERS_STORE)||'[]').map(x=>String(x).toLowerCase())}catch(e){return []}}
function rememberDeletedUser(u){let ids=deletedUsers();[u?.id,u?.email,u?.username].map(x=>String(x||'').toLowerCase()).filter(Boolean).forEach(x=>{if(!ids.includes(x))ids.push(x)});localStorage.setItem(DELETED_USERS_STORE,JSON.stringify(ids));}
function isDeletedServerUser(su){let ids=deletedUsers();return [su?.id,su?.email,su?.username].map(x=>String(x||'').toLowerCase()).some(x=>x&&ids.includes(x));}
async function deleteUserOnServer(user){try{await fetch(backendOrigin()+'/api/delete-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:user?.id,email:user?.email,username:user?.username})});}catch(e){console.warn('User delete sync skipped',e)}}
function markEmailVerified(email){let e=String(email||'').toLowerCase(); if(!e)return; let list=verifiedEmails(); if(!list.includes(e)){list.push(e); localStorage.setItem(VERIFIED_EMAILS_STORE,JSON.stringify(list));}}

async function registerUserOnServer(user){try{await fetch(backendOrigin()+'/api/register-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user})});}catch(e){console.warn('User register sync skipped',e)}}

async function syncUserUpdatesFromServer(){
  try{
    let r=await fetch(backendOrigin()+'/api/user-updates');
    let data=await r.json();
    if(!data.ok||!Array.isArray(data.users))return;
    let d=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(OLD_STORE)||'null');
    if(!d)d={session:null,currentUser:null,theme:'light',products:[],cart:[],wishlist:[],orders:[],reviews:[],complaints:[],offers:[],appliedOffer:null,recentlyViewed:[],slide:{title:'Vooloovee Studio',sub:'Animated premium fashion drops by your brand.',code:'NEW'}};
    d.users=Array.isArray(d.users)?d.users:[];
    let changed=false;
    data.users.forEach(su=>{
      if(isDeletedServerUser(su))return;
      let email=clean(su.email).toLowerCase(),sid=clean(su.id);
      if(!email&&!sid)return;
      let u=d.users.find(x=>(email&&(x.email||'').toLowerCase()===email) || (sid&&x.id===sid));
      if(!u){
        u={id:sid||uid('US'),username:clean(su.username)||email.split('@')[0],password:String(su.password||''),name:clean(su.name)||'Vooloovee User',email,emailVerified:!!su.emailVerified,verificationCode:String(su.verificationCode||''),resetCode:'',refundAccount:'',mobile:clean(su.mobile),addresses:Array.isArray(su.addresses)?su.addresses:[]};
        d.users.push(u);changed=true;
      }else{
        if(su.password){u.password=String(su.password);changed=true;}
        if(su.username){u.username=clean(su.username)||u.username;changed=true;}
        if(su.name){u.name=clean(su.name)||u.name;changed=true;}
        if(email)u.email=email;
        if(su.emailVerified)u.emailVerified=true;
      }
    });
    if(changed)localStorage.setItem(STORE,JSON.stringify(d));
  }catch(e){console.warn('User update sync skipped',e)}
}


async function syncVerifiedEmailsFromServer(){try{let r=await fetch(backendOrigin()+'/api/verified-emails');let data=await r.json();if(!data.ok)return;let list=[...new Set([...verifiedEmails(),...(data.verifiedEmails||[]).map(x=>String(x).toLowerCase())])];localStorage.setItem(VERIFIED_EMAILS_STORE,JSON.stringify(list));let d=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(OLD_STORE)||'null');if(d&&Array.isArray(d.users)){d.users.forEach(u=>{if(u.email&&list.includes(String(u.email).toLowerCase()))u.emailVerified=true});localStorage.setItem(STORE,JSON.stringify(d));}}catch(e){console.warn('Verified email sync skipped',e)}}
async function sendVoolooveeEmail(type,user,token){
  let isVerify=type==='verify';
  let link=actionLink(isVerify?'verify':'reset',(user.email||'').toLowerCase(),token,user);
  let payload={
    type,
    toEmail:user.email,
    toName:user.name||user.username||'Vooloovee user',
    subject:isVerify?'Verify your Vooloovee account':'Reset your Vooloovee password',
    title:isVerify?'Verify your Vooloovee account':'Reset your Vooloovee password',
    message:isVerify
      ?'Welcome to Vooloovee. Use the OTP below on the verify page to activate your account. After OTP verification, you will receive another email with a temporary password to log in. Once you log in, you can change your password from your profile.'
      :'Click the button below to safely create a new password for your Vooloovee account.',
    actionLink:link,
    token,
    userData:{id:user.id,username:user.username,password:user.password,name:user.name,email:user.email,tempAfterVerify:!!user.tempAfterVerify,pendingTempPassword:user.pendingTempPassword||'',mobile:user.mobile||'',addresses:user.addresses||[],refundAccount:user.refundAccount||'',paymentDetails:user.paymentDetails||{}}
  };
  try{
    let res=await fetch(backendOrigin()+'/api/send-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    let raw=await res.text();
    let data={};
    try{data=JSON.parse(raw)}catch(_){data={error:raw}}
    if(res.ok&&data.ok)return {ok:true};
    return {ok:false,reason:data.error||('Email API failed with status '+res.status+'. Make sure you opened http://localhost:3000 and restarted npm start.')};
  }catch(e){
    return {ok:false,reason:'Start the Node server first with npm start, then open http://localhost:3000. Do not use Go Live for email testing.'};
  }
}

async function sendGeneralMail(toEmail,toName,subject,title,message,link=''){
  if(!toEmail)return {ok:false,reason:'No email found for this user'};
  try{
    let res=await fetch(backendOrigin()+'/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'general',toEmail,toName,subject,title,message,actionLink:link})});
    let data=await res.json().catch(()=>({}));
    return data.ok?{ok:true}:{ok:false,reason:data.error||'Email could not be sent'};
  }catch(e){return {ok:false,reason:'Start npm server to send email'}}
}
async function sendPromoAnnouncement(offer){
  let d=state(),users=(d.users||[]).filter(u=>u.email&&u.emailVerified);
  if(!users.length)return toast('Promo added. No verified email users to notify yet.','ok');
  let text=`Check out the latest updates in the Vooloovee app. Use promo code ${offer.code} for ${offer.title}.`;
  let results=await Promise.all(users.map(u=>sendGeneralMail(u.email,u.name||u.username,`New Vooloovee promo: ${offer.code}`,'New promo code is live',text,'')));
  let sent=results.filter(r=>r.ok).length;
  toast(`Promo added. Mail sent to ${sent}/${users.length} verified users.`, sent?'ok':'bad');
}

const uid=(p='VL')=>p+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase();
const clean=s=>String(s||'').replace(/[<>]/g,'').trim();
const money=n=>'₹'+Math.round(+n||0).toLocaleString('en-IN');
const nowISO=()=>new Date().toISOString();
const days=(a)=>Math.floor((new Date()-new Date(a))/86400000);
const toDbProduct=p=>({id:p.id,brand:p.brand,name:p.name,category:p.category,price:+p.price||0,discount:+p.discount||0,sizes:p.sizes||[],stock_by_size:p.stockBySize||{},description:p.description||'',image_url:p.image||'',created_at:p.createdAt||nowISO()});
const fromDbProduct=r=>normStock({id:r.id,brand:r.brand,name:r.name,category:r.category,price:r.price,discount:r.discount,sizes:r.sizes||[],stockBySize:r.stock_by_size||{},description:r.description,image:r.image_url||'',createdAt:r.created_at||nowISO()});
async function loadSupabaseProducts(force=false){let c=db(); if(!c||supabaseLoaded&&!force)return; try{let {data,error}=await c.from('products').select('*').order('created_at',{ascending:true}); if(error)throw error; let d=state(),hiddenMap={};(d.products||[]).forEach(p=>hiddenMap[p.id]=!!p.hidden); d.products=(data||[]).map(r=>{let p=fromDbProduct(r);p.hidden=!!hiddenMap[p.id];return p}); save(d,false); supabaseLoaded=true;}catch(e){console.warn('Supabase product load skipped:',e.message||e);}}
async function saveProductToSupabase(product){let c=db(); if(!c)return; let {error}=await c.from('products').upsert(toDbProduct(product)); if(error)throw error;}
async function updateProductStockToSupabase(product){let c=db(); if(!c)return; let {error}=await c.from('products').update({stock_by_size:product.stockBySize, sizes:product.sizes}).eq('id',product.id); if(error)throw error;}
async function deleteProductFromSupabase(id){let c=db(); if(!c)return; let {error}=await c.from('products').delete().eq('id',id); if(error)throw error;}
async function uploadProductImage(file,productId){let c=db(); if(!c||!file)return ''; let safe=(file.name||'image').replace(/[^a-z0-9._-]/gi,'_'); let path=`products/${productId}-${Date.now()}-${safe}`; let {error}=await c.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false}); if(error)throw error; let {data}=c.storage.from('product-images').getPublicUrl(path); return data.publicUrl;}

const productId=d=>{let max=0;(d.products||[]).forEach(p=>{let n=parseInt(String(p.id||'').replace(/\D/g,''))||0;if(n>max)max=n});return 'PRD-'+String(max+1).padStart(4,'0')};
const img=p=>p.image||`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 820'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#2f3a8f'/><stop offset='1' stop-color='#c9a66b'/></linearGradient></defs><rect width='700' height='820' rx='48' fill='#f7f0dc'/><circle cx='550' cy='155' r='125' fill='url(#g)' opacity='.25'/><text x='350' y='390' text-anchor='middle' font-family='Georgia' font-size='76' fill='#24305e'>Vooloovee</text><text x='350' y='450' text-anchor='middle' font-family='Arial' font-size='26' fill='#66736f'>${clean(p.name||'Product')}</text></svg>`)}`;

const USER_SESSION_KEY='vooloovee-active-user-id';
const APP_SESSION_KEY='vooloovee-active-session';
function activeUserId(d){return sessionStorage.getItem(USER_SESSION_KEY)||d?.currentUser||null}
function activeSession(d){return sessionStorage.getItem(APP_SESSION_KEY)||d?.session||null}
function userBucket(d,id){
  d.userData=d.userData||{};
  if(!id)return null;
  d.userData[id]=d.userData[id]||{};
  let b=d.userData[id];
  b.cart=Array.isArray(b.cart)?b.cart:[];
  b.wishlist=Array.isArray(b.wishlist)?b.wishlist:[];
  b.recentlyViewed=Array.isArray(b.recentlyViewed)?b.recentlyViewed:[];
  b.appliedOffer=b.appliedOffer||null;
  return b;
}
function attachUserData(d){
  let id=activeUserId(d);
  if(id){
    let b=userBucket(d,id);
    if(b.cart.length===0&&Array.isArray(d.cart)&&d.cart.length&&d.__scopedDataMigrated!==true)b.cart=d.cart;
    if(b.wishlist.length===0&&Array.isArray(d.wishlist)&&d.wishlist.length&&d.__scopedDataMigrated!==true)b.wishlist=d.wishlist;
    if(b.recentlyViewed.length===0&&Array.isArray(d.recentlyViewed)&&d.recentlyViewed.length&&d.__scopedDataMigrated!==true)b.recentlyViewed=d.recentlyViewed;
    if(!b.appliedOffer&&d.appliedOffer&&d.__scopedDataMigrated!==true)b.appliedOffer=d.appliedOffer;
    d.cart=b.cart;
    d.wishlist=b.wishlist;
    d.recentlyViewed=b.recentlyViewed;
    d.appliedOffer=b.appliedOffer;
    d.currentUser=id;
    d.session=activeSession(d)||'user';
    d.__scopedDataMigrated=true;
  }else{
    d.cart=Array.isArray(d.cart)?d.cart:[];
    d.wishlist=Array.isArray(d.wishlist)?d.wishlist:[];
    d.recentlyViewed=Array.isArray(d.recentlyViewed)?d.recentlyViewed:[];
  }
  return d;
}
function persistUserData(d){
  let id=activeUserId(d);
  if(id){
    let b=userBucket(d,id);
    b.cart=Array.isArray(d.cart)?d.cart:[];
    b.wishlist=Array.isArray(d.wishlist)?d.wishlist:[];
    b.recentlyViewed=Array.isArray(d.recentlyViewed)?d.recentlyViewed:[];
    b.appliedOffer=d.appliedOffer||null;
  }
  return d;
}
function state(){
  let d=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(OLD_STORE)||'null');
  if(!d)d={session:null,currentUser:null,theme:'light',products:[],cart:[],wishlist:[],orders:[],reviews:[],complaints:[],offers:[],appliedOffer:null,recentlyViewed:[],slide:{title:'Vooloovee Studio',sub:'Animated premium fashion drops by your brand.',code:'NEW'}};
  d.products||=[];d.orders||=[];d.reviews||=[];d.complaints||=[];d.loginHelp||=[];
  d.complaints.forEach(c=>{c.autoReply=c.autoReply||'Our support team will reach you as soon as possible.'});
  d.offers||=[];d.users||=[{id:uid('US'),username:'user',password:'User@123',name:'Vooloovee User',refundAccount:''}];
  d.users.forEach(u=>{u.name=u.name||u.username||'User';u.email=u.email||'';u.emailVerified=!!u.emailVerified||verifiedEmails().includes(String(u.email||'').toLowerCase());u.verificationCode=u.verificationCode||'';u.resetCode=u.resetCode||'';u.mobile=u.mobile||'';u.addresses=Array.isArray(u.addresses)?u.addresses:[];u.usedPromoCodes=Array.isArray(u.usedPromoCodes)?u.usedPromoCodes:[];u.rewards=Array.isArray(u.rewards)?u.rewards:[];u.paymentDetails=u.paymentDetails&&typeof u.paymentDetails==='object'?u.paymentDetails:{upi:u.refundAccount||'',cardName:'',cardLast4:''};if(u.address&&!u.addresses.includes(u.address))u.addresses.unshift(u.address);});
  d.currentUser=d.currentUser||null;d.session=d.session||null;
  d=attachUserData(d);
  if(!d.offers.length)d.offers=[{id:uid('OF'),code:'VEL20',title:'First Order Welcome Offer',type:'percent',value:20,min:999,category:'All',active:true,expiry:'2026-12-31',firstOrderOnly:true}];
  d.offers.forEach(o=>{o.oneTime=true;if(String(o.code||'').toUpperCase()==='VEL20')o.firstOrderOnly=true});
  d.slide||={title:'Vooloovee Studio',sub:'Animated premium fashion drops by your brand.',code:'NEW'};
  d.products.forEach(p=>{normStock(p);p.hidden=!!p.hidden});
  d.cart=d.cart.filter(c=>{let p=d.products.find(x=>x.id===c.productId);if(!p||stock(p,c.size)<=0)return false;c.qty=Math.max(1,Math.min(+c.qty||1,stock(p,c.size)));return true});
  d.orders.forEach(o=>{o.createdAt||=nowISO(); if(o.userVisible===undefined)o.userVisible=true; if(!['Delivered','Cancelled'].includes(o.status)&&days(o.createdAt)>=5)o.status=o.delivery='Delivered'});
  save(d,false);try{localStorage.removeItem(OLD_STORE)}catch(e){}
  return d;
}
function save(d,toastIt){persistUserData(d);localStorage.setItem(STORE,JSON.stringify(d)); if(toastIt)toast(toastIt); return true}
function toast(m,t='ok'){let e=$('.toast')||document.body.appendChild(Object.assign(document.createElement('div'),{className:'toast'}));e.className='toast show '+t;e.textContent=m;setTimeout(()=>e.classList.remove('show'),2200)}
function theme(){document.documentElement.dataset.theme=state().theme||'light'}
function loginNeeded(r){let d=state(); if(activeSession(d)!==r)location.href='index.html'}
function logout(){let d=state();sessionStorage.removeItem(APP_SESSION_KEY);sessionStorage.removeItem(USER_SESSION_KEY);d.session=null;d.currentUser=null;save(d);location.href='index.html'} window.logout=logout;
window.toggleTheme=()=>{let d=state();d.theme=d.theme==='dark'?'light':'dark';save(d);theme()};
function normStock(p){let sizes=(p.sizes||[]).map(x=>String(x).trim().toUpperCase()).filter(Boolean); if(!sizes.length)sizes=['FREE SIZE']; p.sizes=sizes; if(!p.stockBySize||Array.isArray(p.stockBySize)){p.stockBySize={};sizes.forEach(s=>p.stockBySize[s]=1)} sizes.forEach(s=>{if(p.stockBySize[s]===undefined)p.stockBySize[s]=1;p.stockBySize[s]=Math.max(0,parseInt(p.stockBySize[s])||0)}); p.stock=sizes.reduce((a,s)=>a+(+p.stockBySize[s]||0),0);return p}
const stock=(p,s)=>+(normStock(p).stockBySize[String(s||p.sizes[0]||'FREE SIZE').toUpperCase()]||0);
const stockText=p=>p.sizes.map(s=>`${s}: ${stock(p,s)}`).join(' · ');
const price=p=>Math.max(0,Math.round(+p.price-(+p.price*(+p.discount||0)/100)));
const delivery=sub=>sub>=1499||sub===0?0:79;
const rewardPool=[{title:'Free Delivery Coupon',detail:'Free delivery on your next order',code:'FREESHIP'},{title:'5% Reward Coupon',detail:'Use 5% off on your next order',code:'REWARD5'},{title:'₹100 Reward Coupon',detail:'Use ₹100 off on your next order above ₹999',code:'REWARD100'},{title:'VIP Style Points',detail:'You received 50 Vooloovee style points',code:'STYLE50'},{title:'Surprise Gift Eligible',detail:'You are eligible for a surprise gift on selected drops',code:'GIFT'}];
const randomReward=()=>({...rewardPool[Math.floor(Math.random()*rewardPool.length)],id:uid('RW'),createdAt:nowISO(),used:false});
const usedPromoList=(d)=>{let u=(d.users||[]).find(x=>x.id===d.currentUser);u&&(u.usedPromoCodes=Array.isArray(u.usedPromoCodes)?u.usedPromoCodes:[]);return u?u.usedPromoCodes:[]};
function authShell(title, subtitle, inner){
  const box=$('.login-box');
  box.innerHTML=`<div class="auth-brand-row"><span class="logo-mark">V</span><span><b>Vooloovee</b></span></div><h2>${title}</h2><p class="auth-subtitle">${subtitle}</p>${inner}`;
}
function authPage(){
  syncVerifiedEmailsFromServer();
  syncUserUpdatesFromServer();
  theme();
  let role='user';
  const renderLogin=()=>{
    authShell('Welcome back','Log in to continue.',`
      <div class="role-tabs premium-tabs"><button class="active" data-role="user">User</button><button data-role="brand">Brand</button></div>
      <form id="loginForm" class="auth-form">
        <label>${role==='brand'?'Brand email or username':'Email or username'}</label>
        <input id="email" placeholder="${role==='brand'?'brand or vooloovee@gmail.com':'name@example.com'}" autocomplete="username">
        <div class="error" id="emailError"></div>
        <div class="field-row"><label>Password</label><button type="button" class="link-btn mini" onclick="toggleAuthPass()">Show</button></div>
        <input id="password" placeholder="Enter password" type="password" autocomplete="current-password">
        <div class="error" id="passwordError"></div>
        <button class="btn primary auth-main-btn">Login</button>
        <div class="auth-links"><button type="button" class="link-btn" onclick="showSignup()">Create account</button><span>•</span><button type="button" class="link-btn" onclick="showVerifyEmail()">Verify email</button><span>•</span><button type="button" class="link-btn" onclick="showResetPassword()">Forgot password?</button><span>•</span><button type="button" class="link-btn" onclick="showLoginHelp()">Help Center</button></div>
        
      </form>`);
    $$('[data-role]').forEach(b=>b.onclick=()=>{role=b.dataset.role; renderLogin(); $$('[data-role]').forEach(x=>x.classList.toggle('active',x.dataset.role===role));});
    $('#loginForm').onsubmit=e=>{
      e.preventDefault();
      let id=clean($('#email').value).toLowerCase(),pass=$('#password').value,d=state();
      if(role==='brand'){
        if((id===brandLogin.username||id===brandLogin.email)&&pass===brandLogin.password){sessionStorage.setItem(APP_SESSION_KEY,'brand');sessionStorage.removeItem(USER_SESSION_KEY);d.session='brand';d.currentUser=null;save(d);location.href='brand.html'}
        else toast('Invalid brand login','bad');
        return;
      }
      let u=d.users.find(x=>(x.username.toLowerCase()===id||(x.email||'').toLowerCase()===id)&&x.password===pass);
      if(!u)return toast('Invalid user username/password','bad');
      if(u.email&&!u.emailVerified)return toast('Please verify your email with OTP first','bad');
      sessionStorage.setItem(APP_SESSION_KEY,'user');sessionStorage.setItem(USER_SESSION_KEY,u.id);d.session='user';d.currentUser=u.id;save(d);location.href='user.html';
    };
  };
  window.toggleAuthPass=()=>{let i=$('#password'); if(!i)return; i.type=i.type==='password'?'text':'password'};
  window.showSignup=()=>{
    authShell('Create your account','Set up your Vooloovee profile.',`
      <form id="loginForm" class="auth-form">
        <label>Full name</label><input id='newName' placeholder='Enter your name' autocomplete='name'>
        <label>Email</label><input id='newEmail' type='email' placeholder='name@example.com' autocomplete='email'>
        <label>Username</label><input id='newUser' placeholder='4-16 letters or numbers' autocomplete='username'>
        <label>Password</label><input id='newPass' type='password' placeholder='Minimum 6 characters' autocomplete='new-password'>
        <button class='btn primary auth-main-btn' type='button' onclick='createUser()'>Create account</button>
        
        <button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button>
      </form>`);
  };
  window.createUser=async()=>{
    let d=state(),name=clean($('#newName').value),email=clean($('#newEmail').value).toLowerCase(),u=clean($('#newUser').value),p=$('#newPass').value;
    if(name.length<2)return toast('Enter your name','bad');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Enter a valid email','bad');
    if(!/^[a-zA-Z0-9_]{4,16}$/.test(u))return toast('Username must be 4-16 letters/numbers','bad');
    if(p.length<6)return toast('Password must be at least 6 characters','bad');
    let existingEmail=d.users.find(x=>String(x.email||'').toLowerCase()===email);
    if(d.users.some(x=>String(x.username||'').toLowerCase()===u.toLowerCase() && String(x.email||'').toLowerCase()!==email))return toast('Username already exists','bad');
    let code=String(Math.floor(100000+Math.random()*900000));
    let user=existingEmail||{id:uid('US'),username:u,password:p,name,email,emailVerified:false,verificationCode:'',resetCode:'',refundAccount:'',mobile:'',addresses:[]};
    if(existingEmail&&existingEmail.emailVerified)return toast('Email already exists','bad');
    user.username=u;user.password=p;user.name=name;user.email=email;user.emailVerified=false;user.verificationCode=code;user.resetCode='';user.refundAccount=user.refundAccount||'';user.mobile=user.mobile||'';user.addresses=Array.isArray(user.addresses)?user.addresses:[];
    if(!existingEmail)d.users.push(user);
    save(d,false); await registerUserOnServer(user);
    let sent=await sendVoolooveeEmail('verify',user,code);
    showOtpScreen(email, sent);
    toast(sent.ok?'OTP sent to your email.':sent.reason, sent.ok?'ok':'bad');
  };
  window.showVerifyEmail=()=>{
    authShell('Verify email','Enter your registered email to receive an OTP.',`<div id='loginForm' class='auth-form'><label>Email</label><input id='verifyEmail' type='email' placeholder='name@example.com'><button class='btn primary auth-main-btn' type='button' onclick='sendVerifyCode()'>Send OTP</button><button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button></div>`);
  };
  window.showLoginHelp=()=>{
    authShell('Login Help Center','Forgot your email ID or account details? Send a request to the brand team.',`<div id='loginForm' class='auth-form'><label>Your name</label><input id='helpName' placeholder='Full name'><label>Mobile number</label><input id='helpMobile' maxlength='10' placeholder='10 digit mobile'><label>What do you remember?</label><textarea id='helpText' placeholder='Example: I forgot my mail ID, my username may be Sara...'></textarea><button class='btn primary auth-main-btn' type='button' onclick='sendLoginHelp()'>Send Help Request</button><button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button></div>`);
  };
  window.sendLoginHelp=()=>{let d=state(),name=clean($('#helpName').value),mobile=clean($('#helpMobile').value),text=clean($('#helpText').value);if(name.length<2)return toast('Enter your name','bad');if(!/^\d{10}$/.test(mobile))return toast('Enter valid mobile number','bad');if(text.length<10)return toast('Tell us what help you need','bad');d.loginHelp=d.loginHelp||[];d.loginHelp.unshift({id:uid('LH'),name,mobile,text,status:'Open',reply:'',createdAt:nowISO()});save(d,'Help request sent. Brand team can reply from Help Center.');location.href='index.html'};
  window.showOtpScreen=(email,sent={ok:true})=>{
    authShell('Enter OTP','Check your email and enter the 6-digit code.',`<div id='loginForm' class='auth-pro-card'><div class='mail-icon'>✉</div><h3>${sent.ok?'OTP sent':'Email could not be sent'}</h3><p class='muted'>${sent.ok?`We sent an OTP to <b>${email}</b>.`:sent.reason}</p><input id='verifyEmail' value='${email}' readonly><label>OTP</label><input id='verifyCode' maxlength='6' inputmode='numeric' placeholder='Enter 6-digit OTP' value='${clean(new URLSearchParams(location.search).get("token")||"")}'><button class='btn primary wide' type='button' onclick='verifyEmailCode()'>Verify account</button><button class='btn ghost wide' type='button' onclick='sendVerifyCode()'>Resend OTP</button><button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button></div>`);
  };
  window.sendVerifyCode=async()=>{
    let d=state(),email=clean($('#verifyEmail').value).toLowerCase(),u=d.users.find(x=>(x.email||'').toLowerCase()===email);
    if(!u)return toast('Email not found','bad');
    u.verificationCode=String(Math.floor(100000+Math.random()*900000)); save(d,false);
    let sent=await sendVoolooveeEmail('verify',u,u.verificationCode);
    showOtpScreen(email,sent);
    toast(sent.ok?'OTP sent to your email.':sent.reason, sent.ok?'ok':'bad');
  };
  window.verifyEmailCode=async()=>{
    let params=new URLSearchParams(location.search);
    let email=clean($('#verifyEmail')?.value||params.get('verify')||params.get('email')).toLowerCase();
    let code=clean($('#verifyCode')?.value||params.get('token'));
    let linkData=decodeLinkData(params.get('data'));
    let d=state(); let u=d.users.find(x=>(x.email||'').toLowerCase()===email);
    let linkIsValid=!!(linkData&&clean(linkData.email).toLowerCase()===email&&String(linkData.token)===code);
    if(!u&&linkIsValid){u={id:linkData.id||uid('US'),username:clean(linkData.username)||email.split('@')[0],password:String(linkData.password||''),pendingTempPassword:String(linkData.tempPassword||''),name:clean(linkData.name)||'Vooloovee User',email,emailVerified:false,verificationCode:code,resetCode:'',refundAccount:'',mobile:'',addresses:[]}; if(!d.users.some(x=>(x.email||'').toLowerCase()===email)&&!d.users.some(x=>String(x.username||'').toLowerCase()===String(u.username||'').toLowerCase()))d.users.push(u); else u=d.users.find(x=>(x.email||'').toLowerCase()===email)||u;}
    if(!u)return toast('Email not found. Please create the profile again or resend the OTP.','bad');
    if(!/^\d{6}$/.test(code))return toast('Enter the 6-digit OTP','bad');
    if(u.verificationCode&&u.verificationCode!==code&&!linkIsValid)return toast('Invalid or expired OTP. Please resend the OTP.','bad');
    try{await fetch(backendOrigin()+'/api/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token:code})});}catch(e){}
    if(linkData&&linkData.tempPassword&&!u.pendingTempPassword)u.pendingTempPassword=String(linkData.tempPassword);
    if(linkData&&linkData.tempAfterVerify)u.tempAfterVerify=true;
    u.emailVerified=true;u.verificationCode='';
    let tempMsg='';
    if(u.tempAfterVerify){
      let tp='Temp@'+Math.floor(100000+Math.random()*900000);
      u.password=tp;u.tempAfterVerify=false;u.pendingTempPassword='';tempMsg=`<p class='muted'>A temporary password has been created and mailed to <b>${email}</b>. Use it to login, then change your password in Profile.</p>`;
      sendGeneralMail(u.email,u.name||u.username,'Your Vooloovee temporary password','Temporary password created',`Your email is verified. Use this temporary password to login: ${tp}. Please change it from your profile after login.`,'').then(()=>toast('Temporary password mailed','ok')).catch(()=>{});
    }else if(u.pendingTempPassword){u.password=String(u.pendingTempPassword);u.pendingTempPassword='';}
    markEmailVerified(email);d.session=null;d.currentUser=null;save(d,false);registerUserOnServer(u);
    authShell('Email verified','Your account is active.',`<div id='loginForm' class='auth-pro-card success'><div class='success-check'>✓</div>${tempMsg}<button class='btn primary wide' type='button' onclick='location.href="index.html"'>Continue to login</button></div>`);
  };
  window.showResetPassword=()=>{
    authShell('Reset password','Enter your email or username to reset your password.',`<div id='loginForm' class='auth-form'><label>Email or username</label><input id='resetId' placeholder='name@example.com'><button class='btn primary auth-main-btn' type='button' onclick='sendResetCode()'>Send reset link</button><button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button></div>`);
  };
  window.sendResetCode=async()=>{
    let d=state(),id=clean($('#resetId').value).toLowerCase(),u=d.users.find(x=>x.username.toLowerCase()===id||(x.email||'').toLowerCase()===id);
    if(!u)return toast('Account not found','bad'); if(!u.email)return toast('No email saved for this account','bad');
    u.resetCode=String(Math.floor(100000+Math.random()*900000)); save(d,false);
    let sent=await sendVoolooveeEmail('reset',u,u.resetCode);
    if(sent.ok){authShell('Check your email','Open the password reset link to create your new password.',`<div id='loginForm' class='auth-pro-card'><div class='mail-icon'>✉</div><h3>Reset link sent</h3><p class='muted'>We sent a password reset link to <b>${u.email}</b>.</p><button class='btn ghost wide' type='button' onclick='showResetPassword()'>Send again</button><button class='link-btn back-link' type='button' onclick='location.href="index.html"'>Back to login</button></div>`);} toast(sent.ok?'Password reset link sent from vooloovee@gmail.com.':sent.reason, sent.ok?'ok':'bad');
  };
  window.resetPassword=async()=>{
    let params=new URLSearchParams(location.search);
    let d=state(),id=clean($('#resetId').value).toLowerCase(),code=clean($('#resetCode').value),pass=$('#resetPass').value;
    let linkData=decodeLinkData(params.get('data'));
    let u=d.users.find(x=>x.username.toLowerCase()===id||(x.email||'').toLowerCase()===id);
    let email=(u?u.email:id).toLowerCase();
    if(pass.length<6)return toast('Password must be at least 6 characters','bad');
    let serverOk=false,serverUser=null;
    try{let r=await fetch(backendOrigin()+'/api/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token:code,newPassword:pass})});let data=await r.json();serverOk=!!data.ok;serverUser=data.userData||null;}catch(e){}
    let linkIsValid=!!(linkData&&String(linkData.token)===code&&(clean(linkData.email).toLowerCase()===id||clean(linkData.email).toLowerCase()===email));
    if(!u&&(serverUser||linkIsValid)){let src=serverUser||linkData;u={id:src.id||uid('US'),username:clean(src.username)||email.split('@')[0],password:pass,name:clean(src.name)||'Vooloovee User',email:clean(src.email||email).toLowerCase(),emailVerified:true,verificationCode:'',resetCode:'',refundAccount:'',mobile:'',addresses:[]};d.users.push(u);}
    if(!u)return toast('Account not found. Please try the reset link in the same browser where the account was created.','bad');
    if(!serverOk&&u.resetCode&&code!==u.resetCode&&!linkIsValid)return toast('Invalid or expired reset link. Please send a new reset link.','bad');
    u.password=pass;u.resetCode='';u.emailVerified=true; d.orders.filter(o=>o.userId===u.id).forEach(o=>o.username=u.username); save(d,false);
    authShell('Password updated','Your new password is saved and synced with the brand user list.',`<div id='loginForm' class='auth-pro-card success'><div class='success-check'>✓</div><button class='btn primary wide' type='button' onclick='location.href="index.html"'>Go to login</button></div>`);
  };
  renderLogin();
  let params=new URLSearchParams(location.search);
  if(params.has('verified')){let email=clean(params.get('verified')).toLowerCase();markEmailVerified(email);let d=state(),u=d.users.find(x=>(x.email||'').toLowerCase()===email);if(u){u.emailVerified=true;u.verificationCode='';save(d,false);}authShell('Email verified','Your account is active.',`<div id='loginForm' class='auth-pro-card success'><div class='success-check'>✓</div><button class='btn primary wide' type='button' onclick='location.href="index.html"'>Continue to login</button></div>`);}
  if(params.has('verify')){let email=clean(params.get('verify')).toLowerCase();showOtpScreen(email,{ok:true});}
  if(params.has('reset')){let email=clean(params.get('reset')).toLowerCase(),token=clean(params.get('token'));authShell('Create new password','Choose a strong new password for your Vooloovee account.',`<div id='loginForm' class='auth-form'><label>Email</label><input id='resetId' value='${email}' readonly><input id='resetCode' type='hidden' value='${token}'><label>New password</label><input id='resetPass' type='password' placeholder='Minimum 6 characters'><button class='btn primary auth-main-btn' type='button' onclick='resetPassword()'>Update password</button></div>`);}
}
function header(active){return `<header class='topbar'><div class='brand-lockup'><span class='logo-mark'>V</span><span><b>Vooloovee</b></span></div><nav>${['Home',...cats,'Offers'].map(x=>`<button class='${active===x?'active':''}' onclick="go('${x}')">${x}</button>`).join('')}</nav><div class='top-actions'><button onclick='toggleTheme()'>◐</button><button onclick="openDrawer('wishlist')">♡<span id='wishCount'>0</span></button><button onclick="openDrawer('cart')">🛍️<span id='cartCount'>0</span></button><button class='profile-icon' title='Profile' onclick="go('Profile')">👤</button><button class='btn ghost' onclick='logout()'>Logout</button></div></header>`}
function counts(){let d=state();$('#cartCount')&&($('#cartCount').textContent=d.cart.reduce((a,c)=>a+(+c.qty||1),0));$('#wishCount')&&($('#wishCount').textContent=d.wishlist.length)}
function userPage(){loginNeeded('user');theme();syncVerifiedEmailsFromServer();renderUser('Home');loadSupabaseProducts().then(()=>renderUser('Home'))} window.go=p=>renderUser(p);
function renderUser(p){$('#app').innerHTML=header(p)+`<main class='page' id='main'></main><aside class='drawer' id='drawer'></aside><section class='modal' id='modal'></section>`;let m=$('#main'); if(p==='Home')home(m); else if(p==='Shop')shop(m); else if(cats.includes(p))category(m,p); else if(p==='Offers')offers(m); else profile(m);counts()}
function home(m){let d=state(),s=d.slide,u=d.users.find(x=>x.id===d.currentUser)||{},recent=d.products.filter(p=>!p.hidden&&d.recentlyViewed.includes(p.id)).sort((a,b)=>d.recentlyViewed.indexOf(a.id)-d.recentlyViewed.indexOf(b.id)).slice(0,8);m.innerHTML=`<section class='hero animated-hero'><div><span class='pill user-script'>${u.name||u.username||'User'}</span><h1>${s.title||'Vooloovee Studio'}</h1><p>${s.sub||'Animated premium fashion drops by your brand.'}</p><button class='btn primary' onclick="go('Shop')">Explore Products</button></div><div class='hero-orbits'><i></i><i></i><i></i><b>V</b></div></section><div class='section-title'><h2>Collections</h2><p>Products appear after brand upload.</p></div><section class='category-grid'>${cats.map(c=>`<article onclick="go('${c}')"><h3>${c}</h3><p>${d.products.filter(p=>p.category===c).length} products</p></article>`).join('')}</section><div class='section-title'><h2>Recently viewed</h2><p class='muted'>Products you opened recently.</p></div><section class='product-grid'>${recent.map(card).join('')||'<div class="empty">No recently viewed products yet.</div>'}</section>`}
function shop(m){m.innerHTML=`<div class='section-title'><div><h2>All Products</h2><p class='muted'>Search, filter and sort across the complete Vooloovee collection.</p></div></div><div class='shop-toolbar'><input id='sbox' placeholder='Search product, brand, ID'><select id='catFilter'><option>All Categories</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select><select id='stockFilter'><option>Available Stock</option><option>Include Sold Out</option><option>Low Stock Only</option></select><select id='sort'><option>Newest</option><option>Price Low</option><option>Price High</option><option>Discount High</option><option>Name A-Z</option></select></div><section class='product-grid' id='plist'></section>`;let draw=()=>drawProductList(state().products.filter(p=>!p.hidden));$('#sbox').oninput=draw;$('#catFilter').onchange=draw;$('#stockFilter').onchange=draw;$('#sort').onchange=draw;draw()}
function drawProductList(products,cat){let q=clean($('#sbox')?.value).toLowerCase(),category=$('#catFilter')?.value||cat||'All Categories',stockMode=$('#stockFilter')?.value||'Available Stock',arr=products.filter(p=>`${p.name} ${p.brand} ${p.id} ${p.category}`.toLowerCase().includes(q));if(cat)arr=arr.filter(p=>p.category===cat);else if(category!=='All Categories')arr=arr.filter(p=>p.category===category);if(stockMode==='Available Stock')arr=arr.filter(p=>p.stock>0);if(stockMode==='Low Stock Only')arr=arr.filter(p=>p.stock>0&&p.stock<=3);let sort=$('#sort')?.value||'Newest';if(sort==='Price Low')arr.sort((a,b)=>price(a)-price(b));if(sort==='Price High')arr.sort((a,b)=>price(b)-price(a));if(sort==='Discount High')arr.sort((a,b)=>(+b.discount||0)-(+a.discount||0));if(sort==='Name A-Z')arr.sort((a,b)=>String(a.name).localeCompare(String(b.name)));$('#plist').innerHTML=arr.map(card).join('')||'<div class="empty">No matching products.</div>'}
function category(m,cat){m.innerHTML=`<div class='section-title'><div><h2>${cat}</h2><p class='muted'>Search, filter and sort within ${cat}.</p></div></div><div class='shop-toolbar'><input id='sbox' placeholder='Search product, brand, ID'><select id='stockFilter'><option>Available Stock</option><option>Include Sold Out</option><option>Low Stock Only</option></select><select id='sort'><option>Newest</option><option>Price Low</option><option>Price High</option><option>Discount High</option><option>Name A-Z</option></select></div><section class='product-grid' id='plist'></section>`;let draw=()=>drawProductList(state().products.filter(p=>!p.hidden),cat);$('#sbox').oninput=draw;$('#stockFilter').onchange=draw;$('#sort').onchange=draw;draw()}
let selected={};
function qtyLeftInCart(d,pid,size){return d.cart.filter(c=>c.productId===pid&&String(c.size).toUpperCase()===String(size).toUpperCase()).reduce((a,c)=>a+(+c.qty||1),0)}
function card(p){normStock(p);let deliveryNote=price(p)>=1499?'Free delivery':'Delivery ₹79';let first=p.sizes.find(s=>stock(p,s)>0)||p.sizes[0];return `<article class='product-card ${p.stock===0?'is-out':''} ${p.stock>0&&p.stock<=3?'is-low':''}'><div class='product-image-wrap'><img src='${img(p)}' onclick="openProduct('${p.id}')">${p.stock===0?`<span class='stock-badge out'>Out of stock</span>`:p.stock<=3?`<span class='stock-badge low'>Low stock</span>`:''}</div><small>${p.brand} · ${p.id}</small><h3 onclick="openProduct('${p.id}')">${p.name}</h3><p><b>${money(price(p))}</b> <s>${money(p.price)}</s> <span>${p.discount||0}% off</span></p><p class='delivery-line'>${deliveryNote} · Free above ₹1,499</p><div class='sizes'>${p.sizes.map(s=>`<button class='${stock(p,s)<=0?'soldout':stock(p,s)<=3?'low-size':''}' ${stock(p,s)<=0?'disabled':''} onclick="pickSize(event,'${p.id}','${s}')">${s}${stock(p,s)<=0?' ✕':''}</button>`).join('')}</div><label class='qty-line'>Qty <input id='qty_${p.id}' type='number' min='1' max='${stock(p,first)}' value='1'></label><button class='btn primary' onclick="addCart('${p.id}')" ${p.stock?'':'disabled'}>${p.stock?'Add to Cart':'Cannot add anymore'}</button><button class='btn ghost' onclick="openProduct('${p.id}')">View</button><button class='btn ghost' onclick="wish('${p.id}')">♡</button></article>`}

window.openProduct=pid=>{let d=state(),p=d.products.find(x=>x.id===pid);if(!p)return toast('Product not found','bad');normStock(p);d.recentlyViewed=[pid,...(d.recentlyViewed||[]).filter(x=>x!==pid)].slice(0,12);save(d,false);let modal=$('#modal');if(!modal){modal=document.body.appendChild(Object.assign(document.createElement('section'),{className:'modal',id:'modal'}))}modal.classList.add('show');modal.innerHTML=`<div class='modal-card'><button class='modal-close' onclick='closeModal()'>×</button><div class='detail'><img src='${img(p)}'><div><small>${p.brand} · ${p.id}</small><h2>${p.name}</h2><p><b>${money(price(p))}</b> <s>${money(p.price)}</s> <span>${p.discount||0}% off</span></p><p>${p.description||'Premium Vooloovee product.'}</p><p class='delivery-line'>${price(p)>=1499?'Free delivery':'Delivery charge ₹79'} · Free delivery above ₹1,499</p>${p.stock>0&&p.stock<=3?`<p class='stock-line low-stock'>Low stock left</p>`:''}<h4>Select size</h4><div class='sizes'>${p.sizes.map(s=>`<button class='${stock(p,s)<=0?'soldout':''}' ${stock(p,s)<=0?'disabled':''} onclick="pickSize(event,'${p.id}','${s}')">${s}${stock(p,s)<=0?' ✕':''}</button>`).join('')}</div><label class='qty-line'>Qty <input id='qty_modal_${p.id}' type='number' min='1' max='${stock(p,p.sizes.find(s=>stock(p,s)>0)||p.sizes[0])}' value='1'></label><button class='btn primary' onclick="addCart('${p.id}','modal')" ${p.stock?'':'disabled'}>${p.stock?'Add to Cart':'Cannot add anymore'}</button><button class='btn ghost' onclick="wish('${p.id}')">Add to Wishlist</button></div></div></div>`};
window.pickSize=(e,p,s)=>{selected[p]=s;$$('.sizes button',e.target.parentElement).forEach(b=>b.classList.remove('chosen'));e.target.classList.add('chosen')};
window.addCart=(pid,src='card')=>{let d=state(),p=d.products.find(x=>x.id===pid),s=selected[pid];if(!p)return;if(!s)return toast('Select size first','bad');let available=stock(p,s),already=qtyLeftInCart(d,pid,s),left=available-already;if(left<=0)return toast('Cannot add anymore. Only '+available+' in stock.','bad');let qInput=$(src==='modal'?`#qty_modal_${pid}`:`#qty_${pid}`);let qty=Math.max(1,parseInt(qInput?.value)||1);if(qty>left)return toast('Cannot add anymore. Only '+left+' left for this size.','bad');let existing=d.cart.find(c=>c.productId===pid&&String(c.size).toUpperCase()===String(s).toUpperCase());if(existing)existing.qty=(+existing.qty||1)+qty;else d.cart.push({id:uid('CT'),productId:pid,size:s,qty});save(d,'Added to cart');counts()};
window.wish=pid=>{let d=state();if(!d.wishlist.includes(pid))d.wishlist.push(pid);save(d,'Added to wishlist');counts()};window.removeWish=pid=>{let d=state();d.wishlist=d.wishlist.filter(x=>x!==pid);save(d,'Removed from wishlist');counts();openDrawer('wishlist')};
const subtotal=d=>d.cart.reduce((a,c)=>{let p=d.products.find(x=>x.id===c.productId);return a+(p?price(p)*(+c.qty||1):0)},0);const firstOrderDone=d=>d.orders.some(o=>o.userId===d.currentUser&&o.userVisible!==false);const promoUsed=(d,o)=>!!(o&&usedPromoList(d).includes(String(o.code||'').toUpperCase()));const offerValid=(d,o)=>!!(o&&o.active&&!promoUsed(d,o)&&new Date(o.expiry+'T23:59:59')>=new Date()&&subtotal(d)>=+o.min&&(!o.firstOrderOnly||!firstOrderDone(d)));const off=d=>{let o=d.offers.find(x=>String(x.code).toUpperCase()===String(d.appliedOffer||'').toUpperCase());if(!offerValid(d,o))return 0;let sub=subtotal(d);return o.type==='percent'?Math.round(sub*+o.value/100):Math.min(sub,+o.value)};
function offers(m){let d=state();m.innerHTML=`<div class='section-title'><h2>Offers</h2><p class='muted'>Valid promo codes disappear after they are used by your account.</p></div><section class='offer-grid'>${d.offers.filter(o=>offerValid(d,o)).map(o=>`<article><h3>${o.code}</h3><p>${o.title}</p><p>${o.type==='percent'?o.value+'%':money(o.value)} off · Min ${money(o.min)}${o.firstOrderOnly?' · First order only':''}</p><button class='btn primary' onclick="applyOffer('${o.code}')">Apply</button></article>`).join('')||'<div class="empty">No valid offers right now.</div>'}</section>`}window.applyOffer=c=>{let d=state(),code=clean(c).toUpperCase(),o=d.offers.find(x=>String(x.code).toUpperCase()===code);if(!offerValid(d,o))return toast(promoUsed(d,o)?'This promo code is already used':(o?.firstOrderOnly&&firstOrderDone(d)?'This promo is only for first order users':'Enter a valid promo code'),'bad');d.appliedOffer=code;save(d,'Promo applied');openDrawer('cart')};
window.openDrawer=t=>{let d=state(),dr=$('#drawer');dr.classList.add('open');if(t==='wishlist'){let ps=d.products.filter(p=>!p.hidden&&d.wishlist.includes(p.id));dr.innerHTML=`<div class='drawer-head'><h2>Wishlist</h2><button onclick='closeDrawer()'>×</button></div>${ps.map(p=>card(p)+`<button class='btn danger wide-btn' onclick="removeWish('${p.id}')">Remove from Wishlist</button>`).join('')||'<div class="empty">No wishlist.</div>'}`;return}if(t==='recent'){let ps=d.products.filter(p=>!p.hidden&&(d.recentlyViewed||[]).includes(p.id)).sort((a,b)=>d.recentlyViewed.indexOf(a.id)-d.recentlyViewed.indexOf(b.id));dr.innerHTML=`<div class='drawer-head'><h2>Recently Viewed</h2><button onclick='closeDrawer()'>×</button></div>${ps.map(card).join('')||'<div class="empty">No recently viewed products.</div>'}`;return}let sub=subtotal(d),disc=off(d),ship=delivery(sub-disc),tot=sub-disc+ship;dr.innerHTML=`<div class='drawer-head'><h2>Cart</h2><button onclick='closeDrawer()'>×</button></div>${d.cart.map(c=>{let p=d.products.find(x=>x.id===c.productId);return p?`<div class='cart-row'><img src='${img(p)}'><div><b>${p.name}</b><p>${p.id} · ${c.size} · Qty ${c.qty||1}</p><p>${money(price(p)*(+c.qty||1))}</p></div><button onclick="removeCart('${c.id}')">Remove</button></div>`:''}).join('')||'<div class="empty">Cart is empty.</div>'}<div class='checkout'><input id='promoInput' placeholder='Promo code' value='${d.appliedOffer||''}'><button class='btn ghost' onclick='applyPromoFromCart()'>Apply</button><p class='muted'>Delivery charge is ₹79. Free delivery above ₹1,499.</p><p>Subtotal: ${money(sub)}</p><p>Discount: -${money(disc)}</p><p>Delivery Charges: ${money(ship)}</p><h3>Total: ${money(tot)}</h3><button class='btn primary' onclick='showCheckout()' ${d.cart.length?'':'disabled'}>Checkout</button></div>`};window.closeDrawer=()=>$('#drawer')?.classList.remove('open');window.removeCart=id=>{let d=state();d.cart=d.cart.filter(c=>c.id!==id);save(d);openDrawer('cart');counts()};window.applyPromoFromCart=()=>{let d=state(),code=clean($('#promoInput').value).toUpperCase(),o=d.offers.find(x=>String(x.code).toUpperCase()===code);if(code&&!offerValid(d,o))return toast(promoUsed(d,o)?'This promo code is already used':(o?.firstOrderOnly&&firstOrderDone(d)?'This promo is only for first order users':'Enter a valid promo code'),'bad');d.appliedOffer=code;save(d,code?'Promo applied':'Promo removed');openDrawer('cart')};
window.showCheckout=()=>{
  let d=state(),u=d.users.find(x=>x.id===d.currentUser)||{},addresses=u.addresses||[],pd=u.paymentDetails||{};
  let sub=subtotal(d),disc=off(d),ship=delivery(sub-disc),tot=sub-disc+ship;
  $('#modal').classList.add('show');
  $('#modal').innerHTML=`<div class='checkout-page'>
    <header class='checkout-nav'>
      <div class='brand-lockup'><span class='logo-mark'>V</span><span><b>Vooloovee</b></span></div>
      <button class='btn ghost' onclick='closeModal();openDrawer("cart")'>Back to Cart</button>
    </header>
    <main class='checkout-main'>
      <section class='payment-left'>
        <button class='back-cart' onclick='closeModal()'>← Back to Cart</button>
        <h1>Checkout</h1><p class='secure-line'>Complete delivery address and choose payment method.</p>
        <div class='delivery-card'>
          <div class='delivery-grid'>
            <label>Full name<input id='payName' value='${u.name||''}' placeholder='Your name'></label>
            <label>Mobile<input id='payMobile' maxlength='10' value='${u.mobile||''}' placeholder='10 digit mobile'></label>
          </div>
          <label>Delivery address</label>
          ${addresses.length?`<select id='addressChoice' onchange='chooseAddress()'><option value='saved'>Use saved address</option>${addresses.map((a,i)=>`<option value='${i}'>${a.slice(0,60)}</option>`).join('')}<option value='new'>Add new address</option></select>`:`<input type='hidden' id='addressChoice' value='new'>`}
          <textarea id='payAddress' placeholder='Enter complete delivery address'>${addresses[0]||''}</textarea>
          <label class='checkline'><input id='saveDelivery' type='checkbox' checked> Save this mobile and address to profile</label>
        </div>
        <div class='payment-methods panel'>
          <h3>Payment</h3>
          <p class='muted'>This demo checkout will confirm the order after checking live stock.</p>
          <input type='hidden' name='payMethod' value='Demo Payment'>
          <button class='btn ghost wide-btn' type='button' onclick='closeModal();openDrawer("cart")'>Back to Cart</button>
        </div>
      </section>
      <aside class='summary-card'>
        <h2><span>▣</span> Order Summary</h2>
        <p><span>Subtotal (${d.cart.length} items)</span><b>${money(sub)}</b></p><p><span>Discount</span><b class='green'>-${money(disc)}</b></p><p><span>Delivery Charges</span><b>${money(ship)}</b></p>
        <hr><h3><span>Total Amount</span><strong>${money(tot)}</strong></h3>
        <div class='safe-box'>🛡 <div><b>Your payment is 100% secure</b><small>We use industry-standard encryption</small></div></div>
        <button class='place-order' onclick='placeOrder()'>Place Order <span>›</span></button>
        <small class='terms'>By placing this order, you agree to our Terms & Conditions and Privacy Policy</small>
      </aside>
    </main>
    <footer class='checkout-badges'><span>🛡<b>Secure<br>Payments</b></span><span>🚚<b>Fast<br>Delivery</b></span><span>▱<b>Easy<br>Returns</b></span><span>✪<b>Top Quality<br>Products</b></span></footer>
  </div>`;
};window.chooseAddress=()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser)||{},v=$('#addressChoice').value;if(v==='new'){$('#payAddress').value='';$('#payAddress').focus();return}if(v==='saved')v=0;$('#payAddress').value=(u.addresses||[])[+v]||''};window.paymentFields=()=>{};window.closeModal=()=>$('#modal')?.classList.remove('show');
window.placeOrder=async()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser);if(!d.cart.length)return toast('Cart empty','bad');let name=clean($('#payName').value),mob=clean($('#payMobile').value),addr=clean($('#payAddress').value),method='Demo Payment';if(name.length<3)return toast('Enter full name','bad');if(!/^\d{10}$/.test(mob))return toast('Enter valid 10 digit mobile','bad');if(addr.length<12)return toast('Enter complete address','bad');let btn=$('.place-order');if(btn){btn.disabled=true;btn.innerHTML='Checking stock... <span>›</span>'}try{await loadSupabaseProducts(true);}catch(e){console.warn(e)}d=state();u=d.users.find(x=>x.id===d.currentUser);let blocked=[];for(let c of d.cart){let p=d.products.find(x=>x.id===c.productId),q=+c.qty||1,available=p?stock(p,c.size):0;if(!p||available<q)blocked.push(`${p?p.name:'Some item'} (${c.size}) has only ${available} left, but your cart has ${q}.`)}if(blocked.length){if(btn){btn.disabled=false;btn.innerHTML='Place Order <span>›</span>'}return toast('Order cannot be processed. '+blocked[0],'bad')}if(u&&$('#saveDelivery')?.checked){u.mobile=mob;u.addresses=u.addresses||[];u.addresses=[addr,...u.addresses.filter(a=>a!==addr)].slice(0,5);u.address=addr;}let sub=subtotal(d),disc=off(d),ship=delivery(sub-disc),tot=sub-disc+ship,items=d.cart.map(c=>({...c,qty:+c.qty||1}));items.forEach(c=>{let p=d.products.find(x=>x.id===c.productId),s=String(c.size).toUpperCase(),q=+c.qty||1;p.stockBySize[s]=Math.max(0,stock(p,s)-q);normStock(p)});try{await Promise.all(items.map(c=>{let p=d.products.find(x=>x.id===c.productId);return p?updateProductStockToSupabase(p):Promise.resolve()}));}catch(e){console.warn('Supabase stock update skipped',e)}let applied=String(d.appliedOffer||'').toUpperCase(),reward=randomReward();if(u){u.rewards=u.rewards||[];u.rewards.unshift(reward);if(applied){u.usedPromoCodes=u.usedPromoCodes||[];if(!u.usedPromoCodes.includes(applied))u.usedPromoCodes.push(applied);}}d.orders.push({id:uid('OD'),userId:u?.id,username:u?.username,items,subtotal:sub,discount:disc,deliveryCharge:ship,promoCode:applied,total:tot,paidAmount:tot,refundedAmount:0,payment:method,status:'Ordered',delivery:'Ordered',refundAccount:u?.refundAccount||'',customer:{name,mobile:mob,address:addr},reward,createdAt:nowISO(),created:new Date().toLocaleString(),userVisible:true});d.cart=[];d.appliedOffer=null;save(d,'Order placed. Reward added to profile');closeModal();closeDrawer();go('Profile')};
function userOrders(d){let u=(d.users||[]).find(x=>x.id===d.currentUser)||{};return d.orders.filter(o=>o.userVisible!==false&&d.currentUser&&(o.userId===d.currentUser||(!o.userId&&o.username&&u.username&&String(o.username).toLowerCase()===String(u.username).toLowerCase())))}
function profile(m){let d=state(),u=d.users.find(x=>x.id===d.currentUser)||d.users[0];m.innerHTML=`<div class='section-title'><h2>My Profile</h2><p>Edit your details, view orders and rewards.</p></div><section class='cards'><div><b>${userOrders(d).length}</b><span>Orders</span></div><div><b>${u.name||'-'}</b><span>Name</span></div><div><b>${u.mobile||'-'}</b><span>Mobile</span></div><div><b>${(u.rewards||[]).length}</b><span>Rewards</span></div><div><b>${d.wishlist.length}</b><span>Wishlist</span></div></section><div class='profile-tabs'><button class='btn primary' onclick="profileView('edit')">Edit Profile</button><button class='btn ghost' onclick="profileView('orders')">View Orders</button><button class='btn ghost' onclick="profileView('rewards')">Rewards</button><button class='btn ghost' onclick="profileView('wishlist')">Wishlist</button><button class='btn ghost' onclick="profileView('recent')">Recently Viewed</button><button class='btn ghost' onclick="profileView('complaints')">Help Center</button><button class='btn danger' onclick="profileView('delete')">Delete Account</button></div><div id='profileView' class='panel'></div>`;profileView('edit')}
window.profileView=v=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser)||d.users[0],box=$('#profileView'),pd=u.paymentDetails||{};if(v==='edit')box.innerHTML=`<h3>Edit Profile</h3><div class='form-grid'><input id='editName' value='${u.name||''}' placeholder='Full name'><input id='newU' value='${u.username||''}' placeholder='Username'><input id='newP' value='${u.password||''}' placeholder='Password'><input id='profileMobile' maxlength='10' value='${u.mobile||''}' placeholder='Mobile number'><textarea id='profileAddress' placeholder='Address'>${(u.addresses||[])[0]||''}</textarea><input id='refundAcc' value='${u.refundAccount||''}' placeholder='Refund account / UPI'><input id='profileUpi' value='${pd.upi||''}' placeholder='Payment UPI ID'><input id='profileCardName' value='${pd.cardName||''}' placeholder='Card holder name'><input id='profileCardLast4' value='${pd.cardLast4||''}' maxlength='4' placeholder='Card last 4 digits'><button class='btn primary' onclick='saveFullProfile()'>Save Profile</button></div>`;if(v==='orders')box.innerHTML=userOrders(d).map(orderUser).join('')||'<div class="empty">No orders shown.</div>';if(v==='rewards')box.innerHTML=`<h3>My Rewards</h3><div class='help-chat'>${(u.rewards||[]).map(r=>`<div class='chat-bubble support'><b>${r.title}</b><br>${r.detail}<br><small>Code: ${r.code} · ${new Date(r.createdAt||nowISO()).toLocaleString()}</small></div>`).join('')||'<p class="muted">No rewards yet. Place an order to get one.</p>'}</div>`;if(v==='wishlist'){let ps=d.products.filter(p=>!p.hidden&&d.wishlist.includes(p.id));box.innerHTML=`<h3>Wishlist</h3><section class='product-grid'>${ps.map(card).join('')||'<div class="empty">No wishlist products yet.</div>'}</section>`}if(v==='recent'){let ps=d.products.filter(p=>!p.hidden&&(d.recentlyViewed||[]).includes(p.id)).sort((a,b)=>d.recentlyViewed.indexOf(a.id)-d.recentlyViewed.indexOf(b.id));box.innerHTML=`<h3>Recently Viewed Products</h3><section class='product-grid'>${ps.map(card).join('')||'<div class="empty">No recently viewed products yet.</div>'}</section>`}if(v==='complaints')box.innerHTML=`<h3>Help Center</h3><div class='help-chat'><div class='chat-bubble support'>Hi ${u.name||u.username}, tell us what happened. Our support team will reach you as soon as possible.</div>${d.complaints.filter(c=>c.userId===u.id).map(c=>`<div class='chat-bubble user'>${c.text}</div><div class='chat-bubble support'>${c.autoReply||'Our support team will reach you as soon as possible.'}</div>${c.solution?`<div class='chat-bubble brand'>Brand: ${c.solution}</div>`:''}`).join('')}</div><textarea id='complaintText' placeholder='Type your issue here'></textarea><button class='btn primary' onclick='raiseComplaint()'>Send to Help Center</button>`;if(v==='delete')box.innerHTML=`<h3>Delete Account</h3><p class='muted'>This will remove your profile from the brand users list and you will be logged out.</p><button class='btn danger' onclick='deleteMyAccount()'>Delete My Account</button>`};
function orderUser(o){let steps=['Ordered','Packed','Shipped','Out for Delivery','Delivered'],current=steps.indexOf(o.status);let d=state();let items=(o.items||[]).map(i=>{let p=d.products.find(x=>x.id===i.productId);return `${p?p.name:i.productId} · ${i.size||''} · Qty ${i.qty||1}`}).join('<br>');let deliveredDate=o.deliveredAt||o.updatedAt||o.createdAt;let returnAllowed=o.status==='Delivered'&&days(deliveredDate)<=5;return `<article class='panel order-history-card'><div class='order-head'><div><h3>${o.id}</h3><p class='muted'>${o.created||new Date(o.createdAt||nowISO()).toLocaleString()} · ${o.payment}</p></div><span class='order-status ${String(o.status).toLowerCase().replace(/\s/g,'-')}'>${o.status}</span></div><p>${items||'Order items unavailable'}</p><p>Total ${money(o.total)} · Delivery ${money(o.deliveryCharge)}</p>${o.reward?`<p>Reward: <b>${o.reward.title}</b> (${o.reward.code})</p>`:''}<div class='tracking-line'>${steps.map((s,i)=>`<span class='${i<=current?'done':''}'><b>${i+1}</b>${s}</span>`).join('')}</div><p>Refund account: ${o.refundAccount||'Not added in profile'}</p>${['Ordered','Packed','Shipped'].includes(o.status)?`<button class='btn danger' onclick="cancelOrder('${o.id}')">Cancel Order</button>`:''}${returnAllowed?`<button class='btn danger' onclick="returnMyOrder('${o.id}')">Return Product</button><p class='muted'>Return available for 5 days after delivery.</p>`:''}${o.status==='Return Requested'?`<p class='muted'>Return request sent to brand.</p>`:''}</article>`}
window.saveFullProfile=()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser),name=clean($('#editName').value),nu=clean($('#newU').value),np=$('#newP').value,mob=clean($('#profileMobile').value),addr=clean($('#profileAddress').value),refund=clean($('#refundAcc').value);if(name.length<2)return toast('Enter valid name','bad');if(!/^[a-zA-Z0-9_]{4,16}$/.test(nu))return toast('Invalid username','bad');if(np.length<6)return toast('Password min 6 chars','bad');if(!/^\d{10}$/.test(mob))return toast('Enter valid 10 digit mobile','bad');if(addr.length<12)return toast('Enter complete address','bad');if(d.users.some(x=>x.id!==u.id&&x.username.toLowerCase()===nu.toLowerCase()))return toast('Username exists','bad');u.name=name;u.username=nu;u.password=np;u.mobile=mob;u.refundAccount=refund;u.addresses=[addr,...(u.addresses||[]).filter(a=>a!==addr)].slice(0,5);u.address=addr;u.paymentDetails={upi:clean($('#profileUpi').value)||refund,cardName:clean($('#profileCardName').value),cardLast4:clean($('#profileCardLast4').value)};d.orders.filter(o=>o.userId===u.id).forEach(o=>{o.username=nu;o.refundAccount=refund});save(d,'Profile updated');registerUserOnServer(u);go('Profile')};
window.saveRefund=()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser),r=clean($('#refundAcc').value);if(r.length<4)return toast('Enter valid refund account','bad');u.refundAccount=r;u.paymentDetails=u.paymentDetails||{};u.paymentDetails.upi=u.paymentDetails.upi||r;d.orders.filter(o=>o.userId===u.id).forEach(o=>o.refundAccount=r);save(d,'Refund account saved')};window.changeCreds=()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser),nu=clean($('#newU').value),np=$('#newP').value;if(!/^[a-zA-Z0-9_]{4,16}$/.test(nu))return toast('Invalid username','bad');if(np.length<6)return toast('Password min 6 chars','bad');if(d.users.some(x=>x.id!==u.id&&x.username.toLowerCase()===nu.toLowerCase()))return toast('Username exists','bad');u.username=nu;u.password=np;d.orders.filter(o=>o.userId===u.id).forEach(o=>o.username=nu);save(d,'Login updated');registerUserOnServer(u)};window.saveDeliveryProfile=()=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser),mob=clean($('#profileMobile').value),addr=clean($('#profileAddress').value);if(!/^\d{10}$/.test(mob))return toast('Enter valid 10 digit mobile','bad');if(addr.length<12)return toast('Enter complete address','bad');u.mobile=mob;u.addresses=u.addresses||[];u.addresses=[addr,...u.addresses.filter(a=>a!==addr)].slice(0,5);u.address=addr;save(d,'Address and mobile saved');registerUserOnServer(u);profileView('edit')};window.useAddress=i=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser);if(!u||!u.addresses[i])return;u.addresses=[u.addresses[i],...u.addresses.filter((_,idx)=>idx!==i)];u.address=u.addresses[0];save(d,'Default address changed');profileView('edit')};window.removeAddress=i=>{let d=state(),u=d.users.find(x=>x.id===d.currentUser);if(!u)return;u.addresses=(u.addresses||[]).filter((_,idx)=>idx!==i);u.address=u.addresses[0]||'';save(d,'Address removed');profileView('edit')};window.cancelOrder=id=>{let d=state(),o=d.orders.find(x=>x.id===id);if(!o||!['Ordered','Packed','Shipped'].includes(o.status))return toast('Cancel allowed only till shipped','bad');o.status=o.delivery='Cancelled';o.refundedAmount=o.paidAmount||0;o.stockReturned=true;o.items.forEach(c=>{let p=d.products.find(x=>x.id===c.productId),q=+c.qty||1;if(p){p.stockBySize[c.size]=(stock(p,c.size)+q);normStock(p);updateProductStockToSupabase(p).catch(e=>console.warn(e))}});save(d,'Order cancelled');go('Profile')};window.returnMyOrder=id=>{let d=state(),o=d.orders.find(x=>x.id===id);if(!o||o.status!=='Delivered')return toast('Return allowed only after delivery','bad');let deliveredDate=o.deliveredAt||o.updatedAt||o.createdAt;if(days(deliveredDate)>5)return toast('Return window closed after 5 days','bad');o.status=o.delivery='Return Requested';o.returnRequestedAt=nowISO();o.refundedAmount=o.paidAmount||0;save(d,'Return request sent to brand');go('Profile')};window.raiseComplaint=()=>{let t=clean($('#complaintText').value),d=state();if(t.length<10)return toast('Complaint must be at least 10 characters','bad');d.complaints.push({id:uid('CP'),userId:d.currentUser,username:(d.users.find(u=>u.id===d.currentUser)||{}).username,text:t,status:'Open',solution:'',autoReply:'Our support team will reach you as soon as possible.',createdAt:nowISO()});save(d,'Complaint submitted');profileView('complaints')};window.deleteMyAccount=()=>{let d=state(),id=d.currentUser;if(!id)return; if(!confirm('Delete this account?'))return;let u=d.users.find(x=>x.id===id);rememberDeletedUser(u);deleteUserOnServer(u);d.users=d.users.filter(u=>u.id!==id);d.orders=d.orders.filter(o=>o.userId!==id);d.complaints=d.complaints.filter(c=>c.userId!==id);d.reviews=d.reviews.filter(r=>r.userId!==id);if(d.userData)delete d.userData[id];d.cart=[];d.session=null;d.currentUser=null;sessionStorage.removeItem(USER_SESSION_KEY);sessionStorage.removeItem(APP_SESSION_KEY);save(d,'Account deleted');location.href='index.html'};
function brandPage(){loginNeeded('brand');theme();renderBrand('Dashboard');Promise.all([syncVerifiedEmailsFromServer(),syncUserUpdatesFromServer()]).then(()=>renderBrand('Users'));loadSupabaseProducts().then(()=>renderBrand('Dashboard'))}
window.refreshBrandData=async(p)=>{toast('Reloading latest data...');await Promise.all([syncVerifiedEmailsFromServer(),syncUserUpdatesFromServer(),loadSupabaseProducts(true)]);renderBrand(p||window.__brandTab||'Dashboard');};
window.renderBrand=p=>{window.__brandTab=p;let d=state(),open=d.complaints.filter(c=>c.status!=='Resolved').length;$('#app').innerHTML=`<div class='admin'><aside class='side'><div class='brand-lockup'><span class='logo-mark'>V</span><b>Brand Studio</b></div>${['Dashboard','Products','Orders','Offers','Help Center','Users','Slideshow'].map(x=>`<button class='${p===x?'active':''}' onclick="renderBrand('${x}')">${x}${x==='Help Center'&&open?` <span class='badge'>${open}</span>`:''}</button>`).join('')}<button onclick='toggleTheme()'>Toggle Theme</button><button onclick='logout()'>Logout</button></aside><main id='adminMain'></main></div>`;let m=$('#adminMain');if(p==='Dashboard')dash(m,d);if(p==='Products')products(m,d);if(p==='Orders')orders(m,d);if(p==='Offers')offerAdmin(m,d);if(p==='Help Center')complaints(m,d);if(p==='Users')users(m,d);if(p==='Slideshow')slide(m,d)};
function totals(d){
  let paid=0,ref=0,del=0;
  d.orders.forEach(o=>{
    paid+=+o.paidAmount||0;
    ref+=+o.refundedAmount||0;
    del+=+o.deliveryCharge||0;
  });
  return{paid,ref,del,net:paid-ref};
}

function dash(m,d){
  d.products.forEach(normStock);
  let totalStock=d.products.reduce((sum,p)=>sum+(+p.stock||0),0);
  let t=totals(d),low=d.products.filter(p=>(+p.stock||0)>0&&(+p.stock||0)<=3).length,out=d.products.filter(p=>(+p.stock||0)===0).length,open=d.complaints.filter(c=>c.status!=='Resolved').length;
  m.innerHTML=`
    <div class='section-title'>
      <div>
        <h2>Admin Analytics Dashboard</h2>
        <p class='muted'>Professional sales, stock, delivery and customer snapshot from the same Vooloovee data.</p>
      </div>
    </div>
    <section class='cards analytics-cards'>
      <div><b>${d.products.length}</b><span>Total Products</span></div>
      <div><b>${totalStock}</b><span>Total Product Stock</span></div>
      <div><b>${d.orders.length}</b><span>Orders</span></div>
      <div><b>${d.users.length}</b><span>Users</span></div>
      <div><b>${money(t.net)}</b><span>Net Revenue</span></div>
      <div><b>${money(t.paid)}</b><span>Total Paid</span></div>
      <div><b>${money(t.ref)}</b><span>Refunds</span></div><div><b>${money(t.del)}</b><span>Delivery Collected</span></div>
      <div><b>${low}</b><span>Low Stock</span></div>
      <div><b>${open}</b><span>Open Help Requests</span></div>
    </section>
    <section class='analytics-grid'>
      <article class='panel chart-card'><h3>Products by Category</h3><canvas id='catChart' height='220'></canvas></article>
      <article class='panel chart-card'><h3>Orders by Status</h3><canvas id='statusChart' height='220'></canvas></article>
      <article class='panel chart-card'><h3>Revenue Trend</h3><canvas id='revenueChart' height='220'></canvas></article>
      <article class='panel chart-card'><h3>Stock Health</h3><canvas id='stockChart' height='220'></canvas></article>
    </section>
    <section class='panel analytics-table'>
      <h3>Quick Insights</h3>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Delivery Charges Collected</td><td>${money(t.del)}</td></tr>
        <tr><td>Total Product Stock</td><td>${totalStock}</td></tr>
        <tr><td>Out of Stock Products</td><td>${out}</td></tr>
        <tr><td>Active Promo Codes</td><td>${d.offers.filter(o=>o.active).length}</td></tr>
        <tr><td>Reviews Received</td><td>${d.reviews.length}</td></tr>
      </table>
    </section>
`;
  requestAnimationFrame(()=>drawAnalytics(d));
}

function groupCount(items,keyFn){
  return items.reduce((acc,item)=>{
    let key=keyFn(item)||'Other';
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{});
}

function drawCanvasBar(canvas,labels,values,opts={}){
  if(!canvas)return;
  let ctx=canvas.getContext('2d'),w=canvas.width=canvas.clientWidth*devicePixelRatio,h=canvas.height=canvas.clientHeight*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  w=canvas.clientWidth; h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  let max=Math.max(...values,1),pad=34,gap=12,barW=(w-pad*2-gap*(values.length-1))/Math.max(values.length,1);
  ctx.font='12px Inter, Segoe UI, Arial';
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#67736f';
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line')||'#dfe9e4';
  for(let i=0;i<4;i++){let y=pad+(h-pad*2)*i/3;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();}
  values.forEach((v,i)=>{
    let x=pad+i*(barW+gap),bh=(h-pad*2)*(v/max),y=h-pad-bh;
    let g=ctx.createLinearGradient(0,y,0,h-pad);g.addColorStop(0,'#111827');g.addColorStop(1,'#b08d57');ctx.fillStyle=g;
    roundRect(ctx,x,y,Math.max(barW,8),bh,10);ctx.fill();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text')||'#0d1d19';
    ctx.fillText(opts.money?money(v):String(v),x,Math.max(y-6,14));
    ctx.save();ctx.translate(x+barW/2,h-10);ctx.rotate(values.length>5?-0.55:0);ctx.textAlign=values.length>5?'right':'center';ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#67736f';ctx.fillText(String(labels[i]).slice(0,12),0,0);ctx.restore();
  });
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

function drawAnalytics(d){
  let cat=groupCount(d.products,p=>p.category),catLabels=Object.keys(cat),catVals=Object.values(cat);
  drawCanvasBar($('#catChart'),catLabels.length?catLabels:['No products'],catVals.length?catVals:[0]);
  let status=groupCount(d.orders,o=>o.status||o.delivery||'Ordered'),statusLabels=Object.keys(status),statusVals=Object.values(status);
  drawCanvasBar($('#statusChart'),statusLabels.length?statusLabels:['No orders'],statusVals.length?statusVals:[0]);
  let byDate={};d.orders.forEach(o=>{let k=new Date(o.createdAt||nowISO()).toLocaleDateString('en-IN',{month:'short',day:'numeric'});byDate[k]=(byDate[k]||0)+(+o.paidAmount||0)-(+o.refundedAmount||0)});
  let revLabels=Object.keys(byDate).slice(-7),revVals=revLabels.map(k=>byDate[k]);
  drawCanvasBar($('#revenueChart'),revLabels.length?revLabels:['No sales'],revVals.length?revVals:[0],{money:true});
  let stockData={};d.products.forEach(p=>{normStock(p);stockData[p.category]=(stockData[p.category]||0)+(+p.stock||0)});
  drawCanvasBar($('#stockChart'),Object.keys(stockData).length?Object.keys(stockData):['No stock'],Object.values(stockData).length?Object.values(stockData):[0]);
}
function products(m,d){m.innerHTML=`<div class='section-title'><h2>Products</h2><p>Next ID: ${productId(d)}. Use category dropdown to view products. Hidden products stay away from the user shop.</p></div><form id='productForm' class='panel form-grid'><input id='pbrand' placeholder='Brand name'><input id='pname' placeholder='Product name'><select id='pcat'>${cats.map(c=>`<option>${c}</option>`).join('')}</select><input id='pprice' type='number' min='1' placeholder='Price'><input id='pdisc' type='number' min='0' max='90' placeholder='Discount'><input id='psizes' placeholder='Sizes e.g. S,M,L,XL'><input id='pstock' type='number' min='0' value='5' placeholder='Stock for each size'><input id='pimagefile' type='file' accept='image/*'><input id='pimageurl' placeholder='Or paste image URL (optional)'><textarea id='pdesc' placeholder='Description (optional)'></textarea><button class='btn primary' type='submit'>Add Product</button><p class='muted' id='productHelp'>Images upload to Supabase Storage. Only the image URL is saved in the database.</p></form><div class='toolbar'><input id='prodSearch' placeholder='Search products'><select id='prodCat'><option value=''>Choose Category</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select></div><div id='productTableWrap'><div class='empty'>Choose a category to view products.</div></div><details class='panel hidden-products-box'><summary><b>Hidden Products</b> (${d.products.filter(p=>p.hidden).length})</summary><div id='hiddenProductsWrap'>${hiddenProductsTable(d.products.filter(p=>p.hidden))}</div></details>`;$('#productForm').onsubmit=e=>{e.preventDefault();addProduct()};let draw=()=>{let q=clean($('#prodSearch').value).toLowerCase(),cat=$('#prodCat').value;if(!cat){$('#productTableWrap').innerHTML='<div class="empty">Choose a category to view products.</div>';return}let arr=state().products.filter(p=>!p.hidden&&p.category===cat&&`${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(q));$('#productTableWrap').innerHTML=prodTable(arr)};$('#prodSearch').oninput=draw;$('#prodCat').onchange=draw;draw()}
function prodTable(ps){return `<table><tr><th>ID</th><th>Name</th><th>Price</th><th>Total Stock</th><th>Each Product Stock</th><th>Edit Stock</th><th>Action</th></tr>${ps.map(p=>{normStock(p);let low=p.stock>0&&p.stock<=3;let out=p.stock===0;return `<tr class='${low||out?'brand-low-row':''}'><td>${p.id}</td><td>${p.brand} - ${p.name}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${out?`<span class='brand-stock-danger'>Out of stock</span>`:low?`<span class='brand-stock-danger'>Low stock</span>`:`<span class='muted'>Enough stock</span>`}<br><div class='brand-size-stock'>${p.sizes.map(s=>`<span>${s}: <b>${stock(p,s)}</b></span>`).join('')}</div></td><td><select id='stockSize_${p.id}' onchange="setStockValue('${p.id}')">${p.sizes.map(s=>`<option value='${s}'>${s} - ${stock(p,s)} left</option>`).join('')}</select><input class='stock-edit' id='stockQty_${p.id}' type='number' min='0' value='${stock(p,p.sizes[0])}'><button class='btn ghost' onclick="saveStock('${p.id}')">Save Stock</button></td><td><button class='btn ghost' onclick="hideProduct('${p.id}')">Hide</button><button class='btn danger' onclick="deleteProduct('${p.id}')">Remove</button></td></tr>`}).join('')||`<tr><td colspan='7'>No products in this category.</td></tr>`}</table>`}
function hiddenProductsTable(ps){return `<table><tr><th>ID</th><th>Name</th><th>Category</th><th>Total Stock</th><th>Action</th></tr>${ps.map(p=>{normStock(p);return `<tr><td>${p.id}</td><td>${p.brand} - ${p.name}</td><td>${p.category}</td><td>${p.stock}</td><td><button class='btn primary' onclick="showProduct('${p.id}')">Add Back To Products</button><button class='btn danger' onclick="deleteProduct('${p.id}')">Remove</button></td></tr>`}).join('')||`<tr><td colspan='5'>No hidden products.</td></tr>`}</table>`}
function validImageUrl(u){u=clean(u); if(!u)return ''; try{let x=new URL(u); return ['http:','https:'].includes(x.protocol)?u:''}catch(e){return ''}}
window.addProduct=async()=>{try{let d=state(),brand=clean($('#pbrand').value),name=clean($('#pname').value),pricev=+$('#pprice').value,disc=+($('#pdisc').value||0),sizes=clean($('#psizes').value).split(',').map(s=>s.trim().toUpperCase()).filter(Boolean),desc=clean($('#pdesc').value),qty=Math.max(0,parseInt($('#pstock')?.value)||0),manualUrl=validImageUrl($('#pimageurl')?.value),file=$('#pimagefile')?.files?.[0];if(brand.length<2)return toast('Brand name required','bad');if(name.length<2)return toast('Product name required','bad');if(!pricev||pricev<1)return toast('Enter valid price','bad');if(disc<0||disc>90)return toast('Discount 0-90','bad');if(!sizes.length)return toast('Enter at least one size','bad');if(new Set(sizes).size!==sizes.length)return toast('Duplicate sizes not allowed','bad');if(clean($('#pimageurl')?.value)&&!manualUrl)return toast('Paste a valid image URL starting with http or https','bad');let newId=productId(d),image=manualUrl;if(file){toast('Uploading image to Supabase...');image=await uploadProductImage(file,newId)}let sb={};sizes.forEach(s=>sb[s]=qty);let product={id:newId,brand,name,category:$('#pcat').value,price:pricev,discount:disc,sizes,stockBySize:sb,description:desc||'Premium Vooloovee product.',image,createdAt:nowISO()};normStock(product);await saveProductToSupabase(product);d.products.push(product);save(d,'Product added to Supabase');renderBrand('Products')}catch(err){console.error(err);toast((err.message&&err.message.includes('bucket'))?'Create product-images bucket using setup SQL first':'Could not add product. Check Supabase setup and fields.','bad')}};window.setStockValue=id=>{let d=state(),p=d.products.find(x=>x.id===id),s=$(`#stockSize_${id}`)?.value;if(p&&s&&$(`#stockQty_${id}`))$(`#stockQty_${id}`).value=stock(p,s)};window.saveStock=async id=>{let d=state(),p=d.products.find(x=>x.id===id),s=$(`#stockSize_${id}`).value,qty=Math.max(0,parseInt($(`#stockQty_${id}`).value)||0);p.stockBySize[s]=qty;normStock(p);try{await updateProductStockToSupabase(p)}catch(e){console.warn(e)}save(d,'Stock updated');renderBrand('Products')};window.hideProduct=id=>{let d=state(),p=d.products.find(x=>x.id===id);if(!p)return;p.hidden=true;if(d.userData)Object.values(d.userData).forEach(b=>{b.wishlist=(b.wishlist||[]).filter(x=>x!==id);b.recentlyViewed=(b.recentlyViewed||[]).filter(x=>x!==id)});save(d,'Product hidden from user shop');renderBrand('Products')};window.showProduct=id=>{let d=state(),p=d.products.find(x=>x.id===id);if(!p)return;p.hidden=false;save(d,'Product added back to products');renderBrand('Products')};window.deleteProduct=async id=>{let d=state();try{await deleteProductFromSupabase(id)}catch(e){console.warn(e)}d.products=d.products.filter(p=>p.id!==id);d.cart=d.cart.filter(c=>c.productId!==id);if(d.userData)Object.values(d.userData).forEach(b=>{b.cart=(b.cart||[]).filter(c=>c.productId!==id);b.wishlist=(b.wishlist||[]).filter(x=>x!==id);b.recentlyViewed=(b.recentlyViewed||[]).filter(x=>x!==id)});save(d,'Product removed');renderBrand('Products')};
function orders(m,d){let t=totals(d);m.innerHTML=`<div class='section-title'><h2>Orders</h2><p>Paid ${money(t.paid)} · Refunded ${money(t.ref)} · Delivery ${money(t.del)} · Net ${money(t.net)}</p></div><div class='toolbar'><input id='orderSearch' placeholder='Search order/customer/product'><select id='orderStatusFilter'><option>All</option><option>Ordered</option><option>Packed</option><option>Shipped</option><option>Out for Delivery</option><option>Delivered</option><option>Cancelled</option></select></div><div id='ordersWrap'></div>`;let draw=()=>{let q=clean($('#orderSearch').value).toLowerCase(),st=$('#orderStatusFilter').value,arr=state().orders.filter(o=>`${o.id} ${o.username||''} ${o.customer?.name||''} ${o.customer?.mobile||''} ${o.items.map(i=>i.productId).join(' ')}`.toLowerCase().includes(q));if(st!=='All')arr=arr.filter(o=>o.status===st);$('#ordersWrap').innerHTML=arr.map(orderCard).join('')||'<div class="empty">No orders.</div>'};$('#orderSearch').oninput=draw;$('#orderStatusFilter').onchange=draw;draw()}
function orderCard(o){return `<details class='panel order-fold'><summary><b>${o.id}</b> · ${o.username||'user'} · ${o.status||'Ordered'} · ${money(o.total||0)}</summary><div class='order-details'><p>${o.items.map(i=>i.productId+' '+i.size+' x'+(i.qty||1)).join(', ')}</p><p>Total ${money(o.total)} · Paid ${money(o.paidAmount)} · Delivery ${money(o.deliveryCharge)} · Refund ${money(o.refundedAmount)}</p>${o.status==='Cancelled'?`<p class='muted'>Stock return: ${o.stockReturned?'Added back to stock':'Not added yet'}</p>`:''}<div class='inline-actions'><select onchange="orderStatus('${o.id}',this.value)">${['Ordered','Packed','Shipped','Out for Delivery','Delivered','Return Requested','Returned','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select>${o.status==='Cancelled'&&!o.stockReturned?`<button class='btn primary' onclick="returnOrderStock('${o.id}')">Add Product Back To Stock</button>`:''}<button class='btn danger' onclick="removeOrder('${o.id}')">Remove Order Completely</button></div></div></details>`}
window.orderStatus=(id,st)=>{let d=state(),o=d.orders.find(x=>x.id===id);if(!o)return;o.status=o.delivery=st;if(st==='Delivered'&&!o.deliveredAt)o.deliveredAt=nowISO();if(st==='Cancelled')o.refundedAmount=o.paidAmount||0;save(d,'Order updated');renderBrand('Orders')};
window.returnOrderStock=async id=>{let d=state(),o=d.orders.find(x=>x.id===id);if(!o)return;if(o.status!=='Cancelled')return toast('Cancel the order first','bad');if(o.stockReturned)return toast('Stock already added back','bad');for(const c of o.items||[]){let p=d.products.find(x=>x.id===c.productId),q=+c.qty||1;if(p){p.stockBySize=p.stockBySize||{};p.stockBySize[c.size]=(stock(p,c.size)+q);normStock(p);try{await updateProductStockToSupabase(p)}catch(e){console.warn(e)}}}o.stockReturned=true;save(d,'Product added back to stock');renderBrand('Orders')};
window.removeOrder=id=>{let d=state();d.orders=d.orders.filter(o=>o.id!==id);save(d,'Order removed from brand and user');renderBrand('Orders')};
function users(m,d){
  m.innerHTML=`<div class='section-title'><h2>Users</h2><p>Total users: <b>${d.users.length}</b></p></div>
  <section class='panel form-grid'>
    <input id='newUserName' placeholder='Full name'>
    <input id='newUsername' placeholder='Username'>
    <input id='newUserEmail' type='email' placeholder='Email'>
    <input id='newUserMobile' placeholder='Mobile number'>
    <input id='newUserPassword' placeholder='Password'>
    <input id='newUserAddress' placeholder='Address'>
    <label class='check-row'><input id='newUserVerified' type='checkbox' checked> Mark email verified</label>
    <button class='btn primary' onclick='brandAddUser()'>Add New User</button>
  </section>
  <div class='inline-actions'><input id='userSearch' placeholder='Search name, username, email, mobile'><button class='btn primary' onclick='exportUsers()'>Download Users CSV</button><button class='btn ghost' onclick="refreshBrandData('Users')">Reload Users</button></div><div id='usersTableWrap'></div>`;
  const draw=()=>{let q=clean($('#userSearch')?.value).toLowerCase();let list=state().users.filter(u=>`${u.name||''} ${u.username||''} ${u.email||''} ${u.mobile||''}`.toLowerCase().includes(q));$('#usersTableWrap').innerHTML=userTable(list)};
  $('#userSearch').oninput=draw;draw();
}
function userTable(list){return `<table><tr><th>Name</th><th>Username</th><th>Email Status</th><th>Mobile</th><th>Address</th><th>Password</th><th>Refund Account</th><th>Action</th></tr>${list.map(u=>`<tr><td>${u.name||'-'}</td><td>${u.username}</td><td>${u.email?`${u.email}<br><small>${u.emailVerified?'Verified':'Not verified'}</small>`:'-'}</td><td>${u.mobile||'-'}</td><td>${(u.addresses||[])[0]||'-'}</td><td><span id='pass_${u.id}'>••••••••</span> <button class='btn ghost' onclick="toggleUserPassword('${u.id}')">View</button></td><td>${u.refundAccount||'-'}</td><td><select class='action-select' onchange="brandUserAction('${u.id}',this.value);this.value=''"><option value=''>Choose action</option><option value='otp'>Send Verify OTP + Temp Password</option><option value='delete'>Delete User</option></select></td></tr>`).join('')||`<tr><td colspan='8'>No users found.</td></tr>`}</table>`}
window.brandAddUser=async()=>{
  let d=state(),name=clean($('#newUserName').value),username=clean($('#newUsername').value),email=clean($('#newUserEmail').value).toLowerCase(),mobile=clean($('#newUserMobile').value),password=String($('#newUserPassword').value||'').trim(),address=clean($('#newUserAddress').value),verified=!!$('#newUserVerified')?.checked;
  if(name.length<2)return toast('Enter user full name','bad');
  if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return toast('Username must be 3-20 letters/numbers','bad');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Enter a valid email','bad');
  if(password.length<6)return toast('Password must be at least 6 characters','bad');
  let existing=d.users.find(u=>String(u.email||'').toLowerCase()===email);
  if(d.users.some(u=>String(u.username||'').toLowerCase()===username.toLowerCase() && (!existing||u.id!==existing.id)))return toast('Username already exists','bad');
  let user=existing||{id:uid('US'),usedPromoCodes:[],rewards:[],paymentDetails:{upi:'',cardName:'',cardLast4:''}};
  user.username=username;user.password=password;user.name=name;user.email=email;user.emailVerified=verified;user.verificationCode='';user.resetCode='';user.refundAccount=user.refundAccount||'';user.mobile=mobile;user.addresses=address?[address]:(Array.isArray(user.addresses)?user.addresses:[]);
  if(!existing)d.users.push(user);
  if(verified)markEmailVerified(email);
  save(d,false);
  await registerUserOnServer(user);
  toast(existing?'Existing user updated':'New user account added','ok');
  renderBrand('Users');
};
window.brandUserAction=(id,action)=>{if(action==='otp')sendLoginOtpMail(id);if(action==='delete')deleteBrandUser(id)};
window.toggleUserPassword=id=>{let d=state(),u=d.users.find(x=>x.id===id),el=$(`#pass_${id}`);if(!u||!el)return;let showing=el.dataset.showing==='yes';el.textContent=showing?'••••••••':u.password;el.dataset.showing=showing?'no':'yes'};
window.sendLoginOtpMail=async id=>{let d=state(),u=d.users.find(x=>x.id===id);if(!u||!u.email)return toast('No email found for this user','bad');u.verificationCode=String(Math.floor(100000+Math.random()*900000));u.pendingTempPassword='';u.tempAfterVerify=true;u.emailVerified=false;save(d,false);await registerUserOnServer(u);let sent=await sendVoolooveeEmail('verify',u,u.verificationCode);toast(sent.ok?'Verify OTP page link mailed. Temporary password will be created only after OTP verification.':sent.reason,sent.ok?'ok':'bad')};
window.deleteBrandUser=async id=>{let d=state(),u=d.users.find(x=>x.id===id);if(!u)return;if(!confirm(`Delete user ${u.username}? This removes their cart, orders, complaints, reviews and saved details.`))return;rememberDeletedUser(u);await deleteUserOnServer(u);d.users=d.users.filter(x=>x.id!==id);if(d.userData)delete d.userData[id];d.orders=d.orders.filter(o=>o.userId!==id);d.complaints=d.complaints.filter(c=>c.userId!==id);d.reviews=d.reviews.filter(r=>r.userId!==id);if(d.currentUser===id){d.currentUser=null;d.session=null;sessionStorage.removeItem(USER_SESSION_KEY);sessionStorage.removeItem(APP_SESSION_KEY)}save(d,'User fully deleted');renderBrand('Users')};
window.exportUsers=()=>{let d=state(),csv='Name,Username,Email,Email Verified,Mobile,Address,Password,Refund Account\n'+d.users.map(u=>`"${u.name||''}","${u.username}","${u.email||''}","${u.emailVerified?'Yes':'No'}","${u.mobile||''}","${((u.addresses||[])[0]||'').replace(/"/g,'""')}","${u.password}","${u.refundAccount||''}"`).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='vooloovee_users.csv';a.click()};
function offerAdmin(m,d){m.innerHTML=`<div class='section-title'><h2>Promo Codes</h2><p class='muted'>All promo codes are one-time use only. New promos mail all verified users.</p></div><section class='panel form-grid'><input id='ocode' placeholder='Code'><input id='otitle' placeholder='Title'><select id='otype'><option value='percent'>Percentage</option><option value='fixed'>Fixed</option></select><input id='ovalue' type='number' placeholder='Value'><input id='omin' type='number' placeholder='Min'><input id='oexp' type='date'><button class='btn primary' onclick='addOffer()'>Add Promo</button></section><table><tr><th>Code</th><th>Offer</th><th>Rule</th><th></th></tr>${d.offers.map(o=>`<tr><td>${o.code}</td><td>${o.title}</td><td>One-time use only${o.firstOrderOnly?' · First order only':''}</td><td><button class='btn danger' onclick="removeOffer('${o.id}')">Remove</button></td></tr>`).join('')}</table>`}window.addOffer=async()=>{let d=state(),code=clean($('#ocode').value).toUpperCase();if(!/^[A-Z0-9]{4,12}$/.test(code))return toast('Code 4-12 chars','bad');if(d.offers.some(o=>String(o.code).toUpperCase()===code))return toast('Promo code already exists','bad');let offer={id:uid('OF'),code,title:clean($('#otitle').value)||code,type:$('#otype').value,value:+$('#ovalue').value||1,min:+$('#omin').value||100,active:true,expiry:$('#oexp').value||'2026-12-31',firstOrderOnly:false,oneTime:true};d.offers.push(offer);save(d,false);renderBrand('Offers');await sendPromoAnnouncement(offer)};window.removeOffer=id=>{let d=state();d.offers=d.offers.filter(o=>o.id!==id);save(d);renderBrand('Offers')};
function complaints(m,d){
  d.loginHelp=d.loginHelp||[];
  let open=[...d.complaints.filter(c=>c.status!=='Resolved'),...d.loginHelp.filter(c=>c.status!=='Resolved'&&c.status!=='Removed')];
  m.innerHTML=`<div class='section-title'><h2>Help Center</h2><p>${open.length?`There is ${open.length} help request(s). Click View.`:'No active help requests.'}</p></div><div id='complaintList'>${d.loginHelp.filter(c=>c.status!=='Removed').map(c=>`<article class='panel'><h3>${c.status} · Login Help · ${c.name}</h3><p>${c.text.slice(0,100)}</p><p class='muted'>Mobile: ${c.mobile}</p><button class='btn primary' onclick="viewLoginHelp('${c.id}')">View Login Help</button></article>`).join('')}${d.complaints.map(c=>`<article class='panel'><h3>${c.status} · ${c.username||'user'}</h3><p>${c.text.slice(0,80)}</p><button class='btn primary' onclick="viewComplaint('${c.id}')">View Chat</button></article>`).join('')||(!d.loginHelp.filter(c=>c.status!=='Removed').length?'<div class="empty">No help requests.</div>':'')}</div>`}
window.viewLoginHelp=id=>{let d=state(),c=(d.loginHelp||[]).find(x=>x.id===id);let q=`${c.name||''} ${c.mobile||''}`.toLowerCase();let matches=(d.users||[]).filter(u=>`${u.name||''} ${u.username||''} ${u.email||''} ${u.mobile||''}`.toLowerCase().includes(String(c.mobile||'').toLowerCase())||`${u.name||''}`.toLowerCase().includes(String(c.name||'').toLowerCase().split(' ')[0]||'__none__'));$('#complaintList').innerHTML=`<article class='panel'><button class='btn ghost' onclick="renderBrand('Help Center')">Back</button><h3>Login Help · ${c.name}</h3><div class='help-chat'><div class='chat-bubble user'>${c.text}<br><small>Mobile: ${c.mobile}</small></div>${c.reply?`<div class='chat-bubble brand'>Brand: ${c.reply}</div>`:''}</div><label>Choose registered account to send verify OTP</label><select id='helpUserPick'>${matches.map(u=>`<option value='${u.id}'>${u.name||u.username} · ${u.email||'No email'} · ${u.mobile||'-'}</option>`).join('')}${!matches.length?`<option value=''>No matching user found</option>`:''}</select><div class='inline-actions'><button class='btn primary' onclick="sendHelpOtp('${c.id}')">Send Verify OTP Mail</button><button class='btn ghost' onclick="resolveLoginHelp('${c.id}')">Mark Issue Resolved</button><button class='btn danger' onclick="removeLoginHelp('${c.id}')">Remove Help Request</button></div><textarea id='lhReply' placeholder='Brand notes'>${c.reply||''}</textarea><button class='btn ghost' onclick="saveLoginHelpReply('${c.id}')">Save Brand Notes</button></article>`};
window.sendHelpOtp=async id=>{let d=state(),c=(d.loginHelp||[]).find(x=>x.id===id),uidv=$('#helpUserPick')?.value,u=d.users.find(x=>x.id===uidv);if(!c)return;if(!u||!u.email)return toast('Choose a registered user with email','bad');u.verificationCode=String(Math.floor(100000+Math.random()*900000));u.pendingTempPassword='';u.tempAfterVerify=true;u.emailVerified=false;c.reply=`OTP verification mail sent to ${u.email}. Temporary password will be created only after OTP verification.`;c.linkedUserId=u.id;c.status='OTP Sent';let sent=await sendVoolooveeEmail('verify',u,u.verificationCode);save(d,false);toast(sent.ok?'OTP sent to registered mail ID':sent.reason,sent.ok?'ok':'bad');renderBrand('Help Center')};
window.saveLoginHelpReply=id=>{let d=state(),c=(d.loginHelp||[]).find(x=>x.id===id),s=clean($('#lhReply').value);if(s.length<3)return toast('Enter notes first','bad');c.reply=s;save(d,'Login help notes saved');renderBrand('Help Center')};
window.resolveLoginHelp=id=>{let d=state(),c=(d.loginHelp||[]).find(x=>x.id===id);if(!c)return;c.status='Resolved';save(d,'Issue marked resolved');renderBrand('Help Center')};
window.removeLoginHelp=id=>{let d=state();d.loginHelp=(d.loginHelp||[]).filter(x=>x.id!==id);save(d,'Help request removed');renderBrand('Help Center')};
window.viewComplaint=id=>{let d=state(),c=d.complaints.find(x=>x.id===id);$('#complaintList').innerHTML=`<article class='panel'><button class='btn ghost' onclick="renderBrand('Help Center')">Back</button><h3>Help Chat · ${c.username||'user'}</h3><div class='help-chat'><div class='chat-bubble user'>${c.text}</div><div class='chat-bubble support'>${c.autoReply||'Our support team will reach you as soon as possible.'}</div>${c.solution?`<div class='chat-bubble brand'>Brand: ${c.solution}</div>`:''}</div><textarea id='sol' placeholder='Type brand response'>${c.solution||''}</textarea><div class='inline-actions'><button class='btn primary' onclick="saveSolution('${c.id}')">Send Brand Reply</button><button class='btn ghost' onclick="resolveComplaint('${c.id}')">Mark Resolved</button><button class='btn danger' onclick="removeComplaint('${c.id}')">Remove</button></div></article>`};
window.saveSolution=id=>{let d=state(),c=d.complaints.find(x=>x.id===id),s=clean($('#sol').value);if(s.length<10)return toast('Reply min 10 chars','bad');c.solution=s;c.status='Resolved';save(d,'Reply sent');renderBrand('Help Center')};
window.resolveComplaint=id=>{let d=state(),c=d.complaints.find(x=>x.id===id);if(!c)return;c.status='Resolved';save(d,'Issue marked resolved');renderBrand('Help Center')};
window.removeComplaint=id=>{let d=state();d.complaints=d.complaints.filter(c=>c.id!==id);save(d,'Help item removed');renderBrand('Help Center')};
function slide(m,d){m.innerHTML=`<div class='section-title'><h2>Animated Brand Slideshow</h2></div><section class='panel form-grid'><input id='stitle' value='${d.slide.title||''}' placeholder='Brand title'><input id='ssub' value='${d.slide.sub||''}' placeholder='Subtitle'><button class='btn primary' onclick='saveSlide()'>Save Animated Banner</button></section><section class='hero animated-hero'><div><h1>${d.slide.title}</h1><p>${d.slide.sub}</p></div><div class='hero-orbits'><i></i><i></i><i></i><b>V</b></div></section>`}window.saveSlide=()=>{let d=state();d.slide.title=clean($('#stitle').value)||'Vooloovee Studio';d.slide.sub=clean($('#ssub').value)||'Animated premium brand display.';save(d,'Banner saved');renderBrand('Slideshow')};
return{authPage,userPage,brandPage}})();

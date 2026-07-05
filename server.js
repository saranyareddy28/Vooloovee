require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const GMAIL_USER = process.env.GMAIL_USER || 'vooloovee@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const DATA_FILE = path.join(__dirname, 'vooloovee_email_state.json');
function readEmailState(){
  try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}
  catch(e){return {verifiedEmails:[], pending:{}, resetPending:{}, updatedUsers:{}, deletedUsers:[]}}
}
function writeEmailState(d){
  try{fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2))}catch(e){console.error('Could not save email state:', e)}
}
function markVerified(email){
  const e=String(email||'').trim().toLowerCase(); if(!e)return;
  const d=readEmailState(); d.verifiedEmails=Array.isArray(d.verifiedEmails)?d.verifiedEmails:[];
  if(!d.verifiedEmails.includes(e))d.verifiedEmails.push(e);
  if(d.pending)d.pending[e]=undefined;
  writeEmailState(d);
}
function saveResetPending(email, token, userData){
  const e=String(email||'').trim().toLowerCase(); if(!e)return;
  const d=readEmailState(); d.resetPending=d.resetPending||{};
  d.resetPending[e]={token:String(token||''), userData:userData||null, createdAt:new Date().toISOString()};
  writeEmailState(d);
}
function consumeReset(email, token, newPassword){
  const e=String(email||'').trim().toLowerCase();
  const d=readEmailState(); const pending=d.resetPending&&d.resetPending[e];
  if(!pending || String(pending.token)!==String(token||''))return {ok:false,error:'Invalid or expired reset link'};
  const userData=pending.userData||{}; userData.password=String(newPassword||''); userData.email=e;
  d.updatedUsers=d.updatedUsers||{};
  d.updatedUsers[e]={...userData, email:e, password:String(newPassword||''), updatedAt:new Date().toISOString()};
  d.resetPending[e]=undefined; writeEmailState(d);
  return {ok:true,userData:d.updatedUsers[e]};
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(express.static(__dirname));

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function clean(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

app.get('/api/email-status', (req, res) => {
  res.json({
    ok: true,
    sender: GMAIL_USER,
    configured: Boolean(GMAIL_APP_PASSWORD && !GMAIL_APP_PASSWORD.includes('PASTE_'))
  });
});

app.get('/api/verified-emails', (req,res)=>{
  const d=readEmailState();
  res.json({ok:true, verifiedEmails:Array.isArray(d.verifiedEmails)?d.verifiedEmails:[]});
});

app.get('/api/user-updates', (req,res)=>{
  const d=readEmailState();
  const deleted=new Set((d.deletedUsers||[]).map(x=>String(x).toLowerCase()));
  const users=Object.values(d.updatedUsers||{}).filter(u=>![u.id,u.email,u.username].map(x=>String(x||'').toLowerCase()).some(x=>x&&deleted.has(x)));
  res.json({ok:true, users});
});

app.get('/api/verify-email', (req,res)=>{
  const email=clean(req.query.email).toLowerCase();
  const token=clean(req.query.token);
  const data=String(req.query.data||'');
  const d=readEmailState();
  const pending=d.pending&&d.pending[email];
  if(!isEmail(email))return res.redirect('/index.html?verifyError=missing-email');
  if(pending && pending.token && String(pending.token)!==String(token)){
    return res.redirect('/index.html?verifyError=invalid&email='+encodeURIComponent(email));
  }
  let qs='/index.html?verify='+encodeURIComponent(email)+'&token='+encodeURIComponent(token);
  if(data)qs+='&data='+encodeURIComponent(data);
  return res.redirect(qs);
});

app.post('/api/verify-email', (req,res)=>{
  const email=clean((req.body||{}).email).toLowerCase();
  const token=clean((req.body||{}).token);
  const d=readEmailState();
  const pending=d.pending&&d.pending[email];
  if(!isEmail(email))return res.status(400).json({ok:false,error:'Missing email'});
  if(pending && pending.token && String(pending.token)!==String(token))return res.status(400).json({ok:false,error:'Invalid verification link'});
  let tempPassword='';
  if(pending && pending.userData && pending.userData.tempAfterVerify){
    tempPassword='Temp@'+Math.floor(100000+Math.random()*900000);
    d.updatedUsers=d.updatedUsers||{};
    d.updatedUsers[email]={...pending.userData,email,emailVerified:true,password:tempPassword,pendingTempPassword:'',tempAfterVerify:false,updatedAt:new Date().toISOString()};
  }else if(pending && pending.userData){
    d.updatedUsers=d.updatedUsers||{};
    d.updatedUsers[email]={...pending.userData,email,emailVerified:true,updatedAt:new Date().toISOString()};
  }
  d.verifiedEmails=Array.isArray(d.verifiedEmails)?d.verifiedEmails:[];
  if(!d.verifiedEmails.includes(email))d.verifiedEmails.push(email);
  if(d.pending)d.pending[email]=undefined;
  writeEmailState(d);
  res.json({ok:true,email,tempPassword});
});


app.post('/api/reset-password', (req,res)=>{
  const email=clean((req.body||{}).email).toLowerCase();
  const token=clean((req.body||{}).token);
  const newPassword=String((req.body||{}).newPassword||'');
  if(!isEmail(email))return res.status(400).json({ok:false,error:'Missing email'});
  if(newPassword.length<6)return res.status(400).json({ok:false,error:'Password must be at least 6 characters'});
  const result=consumeReset(email, token, newPassword);
  if(!result.ok)return res.status(400).json(result);
  res.json({ok:true,email,userData:result.userData});
});



app.post('/api/delete-user', (req,res)=>{
  const id=clean((req.body||{}).id).toLowerCase();
  const email=clean((req.body||{}).email).toLowerCase();
  const username=clean((req.body||{}).username).toLowerCase();
  const d=readEmailState();
  d.deletedUsers=Array.isArray(d.deletedUsers)?d.deletedUsers:[];
  [id,email,username].filter(Boolean).forEach(x=>{if(!d.deletedUsers.includes(x))d.deletedUsers.push(x)});
  if(d.updatedUsers){
    Object.keys(d.updatedUsers).forEach(k=>{
      const u=d.updatedUsers[k]||{};
      if([u.id,u.email,u.username,k].map(x=>String(x||'').toLowerCase()).some(x=>x&&d.deletedUsers.includes(x)))delete d.updatedUsers[k];
    });
  }
  if(email&&d.pending)d.pending[email]=undefined;
  if(email&&d.resetPending)d.resetPending[email]=undefined;
  writeEmailState(d);
  res.json({ok:true});
});

app.post('/api/register-user', (req,res)=>{
  const src=(req.body||{}).user||{};
  const email=clean(src.email).toLowerCase();
  const id=clean(src.id);
  if(!isEmail(email))return res.status(400).json({ok:false,error:'Missing user email'});
  const d=readEmailState();
  d.updatedUsers=d.updatedUsers||{};
  d.updatedUsers[email]={
    id:id||('US'+Date.now()),
    username:clean(src.username)||email.split('@')[0],
    password:String(src.password||''),
    name:clean(src.name)||'Vooloovee User',
    email,
    emailVerified:!!src.emailVerified,
    verificationCode:String(src.verificationCode||''),
    mobile:clean(src.mobile),
    addresses:Array.isArray(src.addresses)?src.addresses:[],
    refundAccount:clean(src.refundAccount),
    paymentDetails:src.paymentDetails&&typeof src.paymentDetails==='object'?src.paymentDetails:{},
    updatedAt:new Date().toISOString()
  };
  writeEmailState(d);
  res.json({ok:true,user:d.updatedUsers[email]});
});

app.post('/api/send-email', async (req, res) => {
  try {
    if (!GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD.includes('PASTE_')) {
      return res.status(500).json({
        ok: false,
        error: 'Gmail sender is not configured. Add the Google App Password for vooloovee@gmail.com in .env.'
      });
    }

    const { toEmail, toName, subject, title, message, actionLink, token, userData } = req.body || {};
    const type = clean((req.body || {}).type);
    if (!isEmail(toEmail) || !subject || (type !== 'verify' && type !== 'general' && !actionLink)) {
      return res.status(400).json({ ok: false, error: 'Missing user email, subject, or action details.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const safeName = clean(toName) || 'Vooloovee user';
    const safeTitle = clean(title) || clean(subject);
    const safeMessage = clean(message);
    const safeLink = String(actionLink || '').trim();
    const safeOtp = String(token || '').trim();

    if (type === 'verify') {
      const d = readEmailState();
      d.pending = d.pending || {};
      d.pending[String(toEmail).trim().toLowerCase()] = { token: String(token || ''), userData: userData || null, createdAt: new Date().toISOString() };
      writeEmailState(d);
    }
    if (type === 'reset') {
      saveResetPending(toEmail, token, userData || null);
    }

    await transporter.sendMail({
      from: `Vooloovee <${GMAIL_USER}>`,
      to: `${safeName} <${toEmail}>`,
      subject: clean(subject),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:26px;border:1px solid #e5e7eb;border-radius:20px;background:#ffffff">
          <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#6b7280;font-weight:700">Vooloovee</div>
          <h2 style="margin:10px 0 8px;color:#111827">${safeTitle}</h2>
          <p style="color:#374151;line-height:1.65;font-size:15px">${safeMessage}</p>
          ${type === 'verify' ? `<div style="margin:24px 0;padding:18px 22px;border-radius:16px;background:#f3f4f6;text-align:center;font-size:32px;font-weight:800;letter-spacing:.18em;color:#111827">${safeOtp}</div><p style="margin:18px 0"><a href="${safeLink}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">Open Verify OTP Page</a></p><p style="color:#6b7280;font-size:13px;line-height:1.5">Open the link and enter this OTP to verify your account.<br>After OTP verification, you will receive another email with a temporary password to log in. Once you log in, you can change your password from your profile.<br>If the button does not work, copy and open this link:<br>${safeLink}</p>` : (type === 'general' ? (safeLink ? `<p style="margin:24px 0"><a href="${safeLink}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">Open Vooloovee</a></p>` : ``) : `<p style="margin:24px 0"><a href="${safeLink}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">Update Password</a></p><p style="color:#6b7280;font-size:13px;line-height:1.5">If the button does not work, copy and open this link:<br>${safeLink}</p>`)}
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">This email was sent from ${GMAIL_USER}. Do not share this ${type === 'verify' ? 'OTP' : 'link'} with anyone.</p>
        </div>
      `,
      text: type === 'verify' ? `${safeTitle}\n\n${safeMessage}\n\nOpen verify page: ${safeLink}\nYour OTP: ${safeOtp}\n\nAfter OTP verification, you will receive another email with a temporary password to log in. Once you log in, you can change your password from your profile.\n\nThis email was sent from ${GMAIL_USER}. Do not share this OTP with anyone.` : (type === 'general' ? `${safeTitle}\n\n${safeMessage}${safeLink ? `\n\nOpen: ${safeLink}` : ''}\n\nThis email was sent from ${GMAIL_USER}.` : `${safeTitle}\n\n${safeMessage}\n\nOpen this secure link: ${safeLink}\n\nThis email was sent from ${GMAIL_USER}. Do not share this link with anyone.`)
    });

    res.json({ ok: true, sender: GMAIL_USER });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ ok: false, error: 'Email could not be sent. Check the Gmail App Password and server console.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Vooloovee running at http://localhost:${PORT}`);
  console.log(`OTP verification and reset emails will be sent from ${GMAIL_USER}`);
});

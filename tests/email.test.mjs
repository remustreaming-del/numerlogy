import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../db/schema.ts';

const bundle = await build({stdin:{contents:'export * from "./lib/email.ts"; export {GET as callback} from "./app/api/qpay/callback/[id]/route.ts";',resolveDir:process.cwd()}, bundle:true, write:false, platform:'node', format:'esm', plugins:[{
  name:'email-test-bindings', setup(b) {
    b.onResolve({filter:/^@\/db$/},()=>({path:'db',namespace:'test'}));
    b.onResolve({filter:/^@\/lib\/server$/},()=>({path:'server',namespace:'test'}));
    b.onResolve({filter:/^@\/lib\/natal-pdf$/},()=>({path:'pdf',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},({path})=>({contents:path==='db'?'export const getDb=()=>globalThis.emailTestDb':path==='server'?'export const setting=k=>globalThis.emailTestSettings[k]; export const paymentReady=()=>true; export const matches=async()=>true; export const json=x=>Response.json(x); export const confirmPayment=async()=>{throw Error("Paid orders must not verify payment again")}':'export const makeNatalPdf=async()=>new Uint8Array([37,80,68,70])'}));
  }
}]});
const {deliverReport,retryReportEmails,callback}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const sql=new DatabaseSync(':memory:');
for (const name of ['0000_loving_ricochet','0001_father_child_email','0002_safe_blue_marvel']) sql.exec(await readFile(`drizzle/${name}.sql`,'utf8'));
globalThis.emailTestDb=drizzle(async(query,params,method)=>{
  const stmt=sql.prepare(query);
  if(method==='run') {stmt.run(...params);return {rows:[]};}
  stmt.setReturnArrays(true);
  const rows=stmt.all(...params);
  return {rows:method==='get'?rows[0]:rows};
},{schema});
const originalFetch=globalThis.fetch;
let sends=[];
function reset() {
  sql.exec('DELETE FROM orders'); sends=[];
  globalThis.emailTestSettings={RESEND_API_KEY:'test',EMAIL_FROM:'Toono <reports@example.com>'};
  globalThis.fetch=async(url,init)=>{sends.push({url,body:JSON.parse(init.body)});return Response.json({id:'provider-id'});};
}
function insert(id,emailStatus=null,emailedAt=null,status='paid') {
  sql.prepare(`INSERT INTO orders(id,access_hash,callback_hash,name,birthday,father_name,father_birthday,email,language,amount,year,status,created_at,email_status,emailed_at) VALUES (?, 'hash','hash','Test','1995-06-13','Father','1962-03-05','customer@example.com','mn',10000,2026,?,1,?,?)`).run(id,status,emailStatus,emailedAt);
}
const row=async(id)=>(await globalThis.emailTestDb.query.orders.findFirst({where:(o,{eq})=>eq(o.id,id)}));
test.after(()=>{globalThis.fetch=originalFetch;sql.close();});
test('scheduled delivery recovers failed and abandoned sends, including missing timestamps',async()=>{
  reset(); insert('failed','failed',Date.now()-600_000); insert('stuck','sending',Date.now()-600_000);insert('missing-time','failed');insert('new');
  for(let i=0;i<4;i++) await retryReportEmails();assert.equal(sends.length,4);
  for(const id of ['failed','stuck','missing-time','new']) assert.equal((await row(id)).emailStatus,'sent');
});
test('scheduled delivery excludes unpaid, already sent and active attempts',async()=>{
  reset();insert('unpaid',null,null,'pending');insert('sent','sent',1);insert('active','sending',Date.now());insert('backoff','failed',Date.now());
  await retryReportEmails(); assert.equal(sends.length,0);
});
test('concurrent callbacks and scheduled delivery claim an order only once',async()=>{
  reset();insert('race');const order=await row('race');await Promise.all([deliverReport(order),deliverReport(order),retryReportEmails()]);assert.equal(sends.length,1);
});
test('provider failures stay retryable and do not prevent other deliveries',async()=>{
  reset();insert('fails');insert('works');let attempts=0;
  globalThis.fetch=async()=>++attempts===1?new Response('Unavailable',{status:503}):Response.json({id:'accepted'});
  await retryReportEmails();await retryReportEmails();assert.equal((await row('fails')).emailStatus,'failed');assert.equal((await row('works')).emailStatus,'sent');
});
test('missing email credentials leave orders pending for a later retry',async()=>{
  reset();insert('pending');delete globalThis.emailTestSettings.RESEND_API_KEY;await retryReportEmails();assert.equal(sends.length,0);assert.equal((await row('pending')).emailStatus,null);
});

test('a repeated payment callback retries a paid order instead of skipping delivery',async()=>{
  reset();insert('callback','failed',Date.now()-600_000);
  const response=await callback(new Request('https://example.com/api/qpay/callback/callback?key='+ 'k'.repeat(36)),{params:Promise.resolve({id:'callback'})});
  assert.equal(response.status,200);assert.equal(sends.length,1);assert.equal((await row('callback')).emailStatus,'sent');
});
test('an unavailable PDF font does not block the paid natal reading email',async()=>{
  reset();insert('natal');
  sql.prepare('UPDATE orders SET product=?,chart_json=? WHERE id=?').run('natal',JSON.stringify({input:{name:'Test',birthDate:'1995-06-13',birthTime:'12:00'},city:{name:'Ulaanbaatar'},sections:[{group:'intro',title:'Reading',paragraphs:['Full report'] }]}),'natal');
  globalThis.emailTestSettings.PUBLIC_ORIGIN='https://example.com';let fontSignal;
  globalThis.fetch=async(url,init)=>{if(String(url).includes('/fonts/')) {fontSignal=init.signal;throw Error('Font unavailable');}sends.push(JSON.parse(init.body));return Response.json({id:'accepted'});};
  await retryReportEmails();assert.ok(fontSignal instanceof AbortSignal);assert.equal(sends.length,1);assert.ok(sends[0].text.includes('Full report'));assert.equal((await row('natal')).emailStatus,'sent');
});

test('each scheduled run generates at most one PDF within the Worker CPU budget',async()=>{
  reset();insert('first');insert('second');await retryReportEmails();assert.equal(sends.length,1);await retryReportEmails();assert.equal(sends.length,2);
});

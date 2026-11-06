import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {publicHtmlFiles} from './site-pages.mjs';

const root=process.cwd();
const dir=path.join(root,'docs/editorial-recovery-20261106');
const registryPath=path.join(root,'data/catalog/registry.json');
const files=[...publicHtmlFiles(),'data/catalog/registry.json','data/catalog/editorial-copy.json',
 'output/catalog/registry.json',...['apartments','houses','lands','home'].map(x=>'output/'+x+'/new-objects.json'),
 'data/catalog/source-feeds.json','docs/owner/registry-to-verify.csv','docs/owner/catalog-completeness-20261103.json',
 'docs/owner/seo-pages-decision.csv','docs/editorial-20261106/seo-coverage.json','sitemap.xml'];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const snapshot=()=>Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
const build=()=>{
 for(const script of ['build-registry','build-object-pages','build-seo-pages'])
  execFileSync(process.execPath,['_tools/'+script+'.mjs'],{cwd:root,stdio:'pipe'});
};
const original=snapshot(),registryBackup=fs.readFileSync(registryPath);
build();
assert.deepEqual(snapshot(),original,'ordinary repeat build must be byte-identical');
// Deliberately remove only this generated file. The complete original bytes are
// held in memory and restored if reconstruction fails; no source is removed.
try{
 fs.unlinkSync(registryPath);
 build();
 assert.deepEqual(snapshot(),original,'clean reconstruction must not depend on previous generated registry');
}catch(error){fs.writeFileSync(registryPath,registryBackup);throw error;}
// A stale review must fail before overwriting any generated output.
const copyPath=path.join(root,'data/catalog/editorial-copy.json');
const copyBackup=fs.readFileSync(copyPath);
try{
 const stale=JSON.parse(copyBackup);
 stale.house_01.sourceHash='0'.repeat(64);
 fs.writeFileSync(copyPath,JSON.stringify(stale));
 const result=spawnSync(process.execPath,['_tools/build-registry.mjs'],{cwd:root,encoding:'utf8'});
 assert.notEqual(result.status,0,'a mismatched saved review must stop the build');
 assert.match(result.stderr,/Saved editorial copy needs source review: house_01/);
 assert.equal(hash(fs.readFileSync(registryPath)),hash(registryBackup),'failed review cannot replace registry');
}finally{fs.writeFileSync(copyPath,copyBackup);}
assert.deepEqual(snapshot(),original,'guard verification restores every reviewed file');
const result={checkedFiles:files.length,ordinaryRebuild:'byte-identical',registryDeletedRebuild:'byte-identical',
 staleReviewGuard:'rejected before generated files were overwritten',sourceOfReviewedCopy:'data/catalog/editorial-copy.json',hashes:original};
fs.writeFileSync(path.join(dir,'rebuild-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({files:files.length,repeat:result.ordinaryRebuild,clean:result.registryDeletedRebuild,stale:result.staleReviewGuard}));

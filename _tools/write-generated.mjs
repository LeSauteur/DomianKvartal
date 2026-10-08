import fs from 'node:fs';
import path from 'node:path';

// Avoid needless rewrites and publish complete generated files atomically.
// Replacing a file also avoids Windows truncation failures when a reader maps it.
export function writeGenerated(file, output) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  if (fs.existsSync(file) && fs.readFileSync(file,'utf8')===output) return;
  const temporary=file+'.generated-'+process.pid;
  try {
    fs.writeFileSync(temporary,output);
    fs.renameSync(temporary,file);
  } finally {
    if(fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

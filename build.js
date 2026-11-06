// Build: concatenates src/*.js (in name order) into app.js inside one closure.
// Usage: node build.js            -> app.js
//        node build.js --single   -> also writes lab-bench-single.html (everything inlined, for previews)
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'src');
const parts=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort().map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(dir,f),'utf8'));
const js=`/*! KGP Lab Bench — built ${new Date().toISOString().slice(0,10)} */\n(()=>{\n${parts.join('\n')}\n})();\n`;
fs.writeFileSync(path.join(__dirname,'app.js'),js);
console.log('app.js',(js.length/1024).toFixed(1)+' KB');
if(process.argv.includes('--single')){
  let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
  html=html.replace(/<link rel="stylesheet" href="styles.css">/,()=>`<style>\n${css}\n</style>`)
           .replace(/<script src="app.js" defer><\/script>/,()=>`<script>\n${js.replace(/<\/script/gi,'<\\/script')}\n</script>`)
           .replace(/<link rel="manifest"[^>]*>\n?/,'');
  fs.writeFileSync(path.join(__dirname,'lab-bench-single.html'),html);
  console.log('lab-bench-single.html',(html.length/1024).toFixed(1)+' KB');
}

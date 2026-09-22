const fs = require('fs');
const files = [
  'src/app/(private)/admin-painel/credenciamentos/page.tsx', 
  'src/app/(private)/anunciar/page.tsx', 
  'src/app/(private)/anunciar/[id]/page.tsx', 
  'src/app/(private)/catalogo/page.tsx', 
  'src/app/(private)/historico/page.tsx', 
  'src/components/cadastro/FormInsumo.tsx', 
  'src/components/perfil/HistoricoDeOperacoes.tsx', 
  'src/server/(GET)-material-details.ts', 
  'src/server/(GET)-materials-and-brands.ts', 
  'src/server/middleware/index.ts'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if(!c.includes('AuthManager from')) {
    const lines = c.split('\n');
    let idx = -1;
    for(let i=0; i<lines.length; i++) {
      if(lines[i].startsWith('import ')) idx = i;
    }
    lines.splice(idx+1, 0, 'import { AuthManager } from "@/lib/AuthManager"');
    fs.writeFileSync(f, lines.join('\n'));
    console.log('Fixed', f);
  }
});

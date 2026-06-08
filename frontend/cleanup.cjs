const fs = require('fs');
const path = require('path');

function rmDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const p = path.join(dir, entry);
        const stat = fs.lstatSync(p);
        if (stat.isDirectory() && !stat.isSymbolicLink()) {
            rmDir(p);
        } else {
            fs.unlinkSync(p);
        }
    }
    fs.rmdirSync(dir);
}

const nm = path.join(process.cwd(), 'node_modules');
console.log('Removing', nm);
rmDir(nm);
console.log('Done');

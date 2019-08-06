require('dotenv').config();
const color = require('chalk');

const debugConsole = (...p) => {
    if (process.env.NODE_ENV === 'dev') {
        switch(p[0])
        {
            case 0:
                p.shift();
                console.log(color.red('[ERROR]  ',...p));
                break;
            case 2:
                p.shift();
                console.log(color.yellow('[WARNING]',...p));
                break;
            default:        
            console.log(color.blue('[INFO]   ',...p));
        }
    } 
}
module.exports = {debugConsole}
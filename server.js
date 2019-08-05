require('dotenv').config();
const https = require('https');
const fs = require('fs');
const app = require('./app');
const url = require('url');
const port = process.env.PORT || 8443;
const path = require('path');
const color = require('chalk');

global.appRoot = path.resolve(__dirname);
const MODE_ENV = process.env.NODE_ENV;

// ********************************   Configuracion logger
const log4js = require('log4js');
log4js.configure('./app/config/log4js_config.json');
global.logger = log4js.getLogger('FileBox');



//const server = http.createServer(app);
let httpsServer = https.createServer({
    key: fs.readFileSync(global.appRoot + '/app/certs/fileManagerServer.key'),
    cert: fs.readFileSync(global.appRoot + '/app/certs/fileManagerServer.cert')
}, app).listen(port, function() {
    logger.info('********* Starting FileManager v.1.0 **********');
    logger.info('Server listen on port ' + port);
    console.log(color.blueBright('Enviroment: ', process.env.NODE_ENV));
    console.log(color.blueBright("https server listening on port " + port + "..."));
});

httpsServer.on('uncaughtException', (request, response, route, error) => {
    console.error(color.red(error.stack));
    response.send(error);
});

// *******************************************************
//  Cierra conexiones cuando la aplicacion es interrumpida
// *******************************************************
var Shutdown = function() {
    logger.info('Shutdown() -> Received kill signal, shutting down gracefully.');
    //console.log("Received kill signal, shutting down gracefully.");

    httpsServer.close(function() {
        logger.info('Shutdown() -> Closed out remaining connections.');
        logger.info('*************** Shutdown finished **************');
        setTimeout(function() { process.exit(); }, 3000);
    });

    // if after
    setTimeout(function() {
        logger.error('Shutdown() -> Could not close connections in time, forcefully shutting down');
        logger.info('*************** Shutdown finished **************');
        setTimeout(function() { process.exit(); }, 1000);
    }, 10 * 1000);
};


// ********************************************************
//  Control de interrupciones
// ********************************************************
// listen for TERM signal .e.g. kill

process.on('SIGTERM', Shutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', Shutdown);

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});
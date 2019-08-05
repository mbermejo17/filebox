"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var fs = require('fs'),
    fsextra = require('fs-extra'),
    mime = require('mime-type'),
    mimeType = require('mime'),
    path = require('path'),
    md5File = require('md5-file'),
    settings = require('../config/config.json'),
    //pathPrefix = '.\\repository\\',
pathPrefix = settings.repositoryPath,
    platform = require('os').platform,
    normalize = require('normalize-path'),
    formidable = require('formidable'),
    uuidv4 = require('uuid/v4'),
    Util = require('./../models/util'),
    moment = require('moment'),
    mail = require('mail').Mail({
  host: settings.emailServer,
  port: settings.emailPort,
  username: settings.emailUserName,
  password: settings.emailUserPassword,
  secure: true,
  insecureAuth: true
});

var Audit = require("../controllers/auditController");

var log = global.logger;

var base64 = require('base-64');

var _getStats = function _getStats(p) {
  fs.stat(p, function (err, stats) {
    return {
      name: stats.name,
      mime: mime.lookup(stats.name),
      folder: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime.getTime(),
      mode: stats.mode
    };
  });
};

var _getUID = function _getUID() {
  var uid = uuidv4();
  return uid.replace(/-/g, '');
};

var _cleanExpiredSharedFiles = function _cleanExpiredSharedFiles(query, callback) {
  Util.CleanExpiredFiles(query, function (response) {
    callback(response);
  });
};
/* const read = (dir) =>
fs.readdirSync(dir)
  .reduce((files, file) =>
    fs.statSync(path.join(dir, file)).isDirectory() ?
      files.concat(read(path.join(dir, file))) :
      files.concat(path.join(dir, file)),
    []);
 */


var _sendMail =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(userName, destName, aFile, Url) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function _sendMail(_x, _x2, _x3, _x4) {
    return _ref.apply(this, arguments);
  };
}();

var _formatSize = function _formatSize(bytes) {
  if (bytes >= 1073741824) {
    bytes = parseInt(bytes / 1000000000) + " GB";
  } else if (bytes >= 1048576) {
    bytes = parseInt(bytes / 1000000) + " MB";
  } else if (bytes >= 1024) {
    bytes = parseInt(bytes / 1000) + " KB";
  } else if (bytes > 1) {
    bytes = bytes + " bytes";
  } else if (bytes == 1) {
    bytes = bytes + " byte";
  } else {
    bytes = "0 byte";
  }

  return bytes;
};

var FileController =
/*#__PURE__*/
function () {
  function FileController() {
    _classCallCheck(this, FileController);
  }

  _createClass(FileController, [{
    key: "getFiles",
    value: function getFiles(req, res, next) {
      var result = {},
          response = [],
          // dirPath = req.body.dirPath
      dirPath = req.query.path;
      if (process.env.NODE_ENV === 'dev') console.log('fileController::req.userData: ', req.userData);
      if (process.env.NODE_ENV === 'dev') console.log('fileController::getFiles:dirPath: ', dirPath);
      var userData = JSON.parse(req.userData);
      if (process.env.NODE_ENV === 'dev') console.log('fileController::getFiles:userData: ', userData);
      var rPath = userData.RootPath;
      if (process.env.NODE_ENV === 'dev') console.log('getFiles:dirPath.indexOf(rPath) ', dirPath.indexOf(rPath));

      if (dirPath.indexOf(rPath) != 1 && rPath != '/') {
        return res.send(JSON.stringify({}));
      }

      dirPath = normalize(pathPrefix + dirPath);
      if (process.env.NODE_ENV === 'dev') console.log('fileController::getFiles:realPath ' + dirPath);

      response = function response(dirPath) {
        return fs.readdirSync(dirPath).reduce(function (list, file) {
          var name = path.join(dirPath, file),
              isFolder = fs.statSync(name).isDirectory(),
              isFile = fs.statSync(name).isFile(),
              stat = fs.statSync(name),
              date = new Date(stat.mtime).toISOString().replace(/T/, ' ').replace(/\..+/, '');
          list = list || [];
          list.push({
            'name': name.split(path.sep).slice(-1)[0],
            'size': stat.size,
            'date': date,
            'isFolder': isFolder,
            'isFile': isFile,
            // "mode": parseInt(stat.mode.toString(8), 10)
            'mode': stat.mode,
            'type': mimeType.getType(name)
          });
          if (isFile) console.log('mode: ', stat.mode);
          return list;
        }, []);
      };

      if (process.env.NODE_ENV === 'dev') console.log(response(dirPath));
      res.send(JSON.stringify(response(dirPath)));
    }
  }, {
    key: "newFolder",
    value: function newFolder(req, res, next) {
      var userName = req.cookies.UserName;
      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var destPath = req.body.path;
      var folderName = req.body.folderName;
      var newFolder = normalize(pathPrefix + destPath + '/' + folderName.toUpperCase());
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      if (process.env.NODE_ENV === 'dev') console.log('Creating new folder ' + newFolder + ' ...');
      fs.mkdir(newFolder, function (err) {
        if (err) {
          if (process.env.NODE_ENV === 'dev') console.error(err);
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: newFolder || '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, err, 'Add new Folder', 'FAIL', function (result) {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });

          if (err.code == 'EEXIST') {
            res.send(JSON.stringify({
              status: 'FAIL',
              message: 'folder already exists',
              data: null
            }));
          } else {
            res.send(JSON.stringify({
              status: 'FAIL',
              message: 'Error code: ' + err.code,
              data: null
            }));
          }
        } else {
          if (process.env.NODE_ENV === 'dev') console.log('Directory created successfully!');
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: newFolder || '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, 'Carpeta ' + folderName + ' creada', 'Add new Folder', 'OK', function (result) {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });
          res.send(JSON.stringify({
            status: 'OK',
            message: 'Carpeta ' + folderName + ' creada',
            data: {
              'folderName': req.body.folderName,
              'Path': req.body.path
            }
          }));
        }
      });
    }
  }, {
    key: "deleteFiles",
    value: function deleteFiles(req, res, next) {
      if (process.env.NODE_ENV === 'dev') console.log(req.body);
      var destPath = req.body.path;
      var fileName = req.body.fileName;
      var fullName = normalize(pathPrefix + destPath + '/' + fileName);
      var userName = req.cookies.UserName;
      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      if (process.env.NODE_ENV === 'dev') console.log('Deleting file ' + fullName + ' ...');
      fsextra.remove(fullName, function (err) {
        if (err) {
          if (process.env.NODE_ENV === 'dev') console.error(err);
          global.logger.error("[".concat(userName, "] fileController::FileController deleteFiles() ->Error deleting file ").concat(fullName, " ").concat(err));
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: fullName || '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, err, 'Delete File', 'FAIL', function () {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });
          res.send(JSON.stringify({
            status: 'FAIL',
            data: err
          }));
        }

        if (process.env.NODE_ENV === 'dev') console.log('File deleted successfully!');
        global.logger.info("[".concat(userName, "] fileController::FileController deleteFiles() ->").concat(fullName, " File deleted successfully!"));
        Audit.Add({
          userName: userName
        }, {
          clientIP: clientIP || '',
          browserIP: browserIP || ''
        }, {
          fileName: fullName || '',
          fileSize: 0
        }, {
          dateString: currentDate,
          unixDate: currentUnixDate
        }, fullName, 'Delete File', 'OK', function () {
          if (process.env.NODE_ENV === 'dev') console.log(result);
        });
        res.send(JSON.stringify({
          status: 'OK',
          data: {
            'fileName': req.body.fileName,
            'Path': req.body.path
          }
        }));
      });
    }
  }, {
    key: "deleteFolder",
    value: function deleteFolder(req, res, next) {
      var newFolder = req.body.path;
      var userName = req.cookies.UserName;
      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      newFolder = normalize(pathPrefix + newFolder);
      fsextra.remove(newFolder, function (err) {
        if (err) {
          console.error(err);
          global.logger.error("[".concat(userName, "] fileController::FileController deleteFolder() ->").concat(newFolder, " ").concat(err));
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: fullName || '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, err, 'Delete Folder', 'FAIL', function () {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });
          res.send(JSON.stringify({
            status: 'FAIL',
            data: err
          }));
        }

        console.log('Directory deleted successfully!');
        global.logger.info("[".concat(userName, "] fileController::FileController deleteFolder() ->").concat(newFolder, " Folder deleted successfully!"));
        Audit.Add({
          userName: userName
        }, {
          clientIP: clientIP || '',
          browserIP: browserIP || ''
        }, {
          fileName: fullName || '',
          fileSize: 0
        }, {
          dateString: currentDate,
          unixDate: currentUnixDate
        }, newFolder, 'Delete Folder', 'OK', function () {
          if (process.env.NODE_ENV === 'dev') console.log(result);
        });
        res.send(JSON.stringify({
          status: 'OK',
          data: req.body.path
        }));
      });
    }
  }, {
    key: "makeMd5File",
    value: function makeMd5File(req, res, next) {
      var repoPath = req.query.destPath;
      var fileName = req.query.fileName;
      var fullFileName = path.join(normalize(pathPrefix + repoPath), fileName); // Calcula MD5

      console.log(fullFileName);
      md5File(fullFileName, function (err, hash) {
        if (err) console.log('******* err MD5 *******'.err);
        console.log("********* The MD5 sum : ".concat(hash, " ************"));
        fs.writeFile(fullFileName + ".md5", hash, function (err) {
          if (err) {
            res.send(JSON.stringify({
              status: 'FAIL',
              message: err,
              data: {
                fileName: fileName
              }
            }));
          }

          console.log("The file " + fullFileName + ".md5 was saved!");
          res.send(JSON.stringify({
            status: 'OK',
            message: "MD5 created",
            data: {
              fileName: fileName,
              md5: hash
            }
          }));
        });
      }); ////////////////  
    }
  }, {
    key: "upload",
    value: function upload(req, res, next) {
      if (process.env.NODE_ENV === 'dev') console.log(req.query); // create an incoming form object

      var form = new formidable.IncomingForm();
      var repoPath = req.query.destPath;
      var fileName = '';
      var fileSize = '';
      var userName = req.cookies.UserName;
      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      form.maxFileSize = settings.maxFileSize * 1024 * 1024; // specify that we want to allow the user to upload multiple files in a single request

      form.multiples = true; // store all uploads in the /uploads directory

      form.uploadDir = normalize(pathPrefix + repoPath);
      if (process.env.NODE_ENV === 'dev') console.log('upload:repoPath ' + form.uploadDir); // every time a file has been uploaded successfully,
      // rename it to it's orignal name

      form.on('file', function (field, file) {
        if (process.env.NODE_ENV === 'dev') console.log(file);
        fileName = file.name;
        fileSize = file.size;
        fs.rename(file.path, path.join(form.uploadDir, file.name), function (err) {
          if (err) throw err;
          fs.stat(path.join(form.uploadDir, file.name), function (err, stats) {
            if (err) throw err;
            console.log('stats: ' + JSON.stringify(stats));
          });
        });
      }); // log any errors that occur

      form.on('error', function (err) {
        if (process.env.NODE_ENV === 'dev') console.log('An error has occured: \n' + err);
        global.logger.error("[".concat(userName, "] fileController::FileController upload() ->").concat(fileName, " ").concat(err));
        Audit.Add({
          userName: userName
        }, {
          clientIP: clientIP || '',
          browserIP: browserIP || ''
        }, {
          fileName: repoPath || '',
          fileSize: fileSize
        }, {
          dateString: currentDate,
          unixDate: currentUnixDate
        }, err, 'Upload File', 'FAIL', function () {
          if (process.env.NODE_ENV === 'dev') console.log(result);
        });
        res.send(JSON.stringify({
          status: 'FAIL',
          message: err,
          data: {
            fileName: fileName
          }
        }));
      }); // once all the files have been uploaded, send a response to the client

      form.on('end', function () {
        global.logger.info("[".concat(userName, "] fileController::FileController upload() ->").concat(fileName, " File Uploaded successfully!"));
        Audit.Add({
          userName: userName
        }, {
          clientIP: clientIP || '',
          browserIP: browserIP || ''
        }, {
          fileName: repoPath || '',
          fileSize: fileSize
        }, {
          dateString: currentDate,
          unixDate: currentUnixDate
        }, fileName, 'Upload File', 'OK', function () {
          if (process.env.NODE_ENV === 'dev') console.log(result);
        });
        res.send(JSON.stringify({
          status: 'OK',
          message: '',
          data: {
            fileName: fileName
          }
        }));
      }); // parse the incoming request containing the form data

      form.parse(req);
    }
  }, {
    key: "postDownload",
    value: function postDownload(req, res, next) {
      var data = req.body;
      var fileName = data.name;
      var userName = data.userName;
      var fileSize = data.size;
      var path = data.path;
      console.log("downloading ->", data);
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
      res.setHeader('Content-Transfer-Encoding', 'binary');
      if (process.env.NODE_ENV === 'dev') console.log(normalize(pathPrefix + '\\' + fileName));
      global.logger.info("[".concat(userName, "] fileController::FileController download() ->Downloading ").concat(path, "/").concat(fileName, " size ").concat(fileSize));
      return res.status(200).json({
        "status": "OK",
        "message": "",
        "data": encodeURIComponent(base64.encode(normalize(pathPrefix + path + '/' + fileName)))
      }); //res.download(normalize(pathPrefix + path + '/' + fileName), fileName)             
      //res.download(normalize(pathPrefix + '\\' + fileName), fileName)
    }
  }, {
    key: "postDownloadSmallFiles",
    value: function postDownloadSmallFiles(req, res, next) {
      var data = req.body;
      var fileName = data.name;
      var userName = data.userName;
      var fileSize = data.size;
      var path = data.path;
      console.log("downloading ->", data);
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
      res.setHeader('Content-Transfer-Encoding', 'binary');
      if (process.env.NODE_ENV === 'dev') console.log(normalize(pathPrefix + '\\' + fileName));
      global.logger.info("[".concat(userName, "] fileController::FileController download() ->Downloading ").concat(path, "/").concat(fileName, " size ").concat(fileSize));
      /*return res.status(200).json({
          "status": "OK",
          "message": "",
          "data": encodeURIComponent(base64.encode(normalize(pathPrefix + path + '/' + fileName)))
      });*/

      return res.download(normalize(pathPrefix + path + '/' + fileName), fileName); //res.download(normalize(pathPrefix + '\\' + fileName), fileName)
    }
  }, {
    key: "getDownload",
    value: function getDownload(req, res, next) {
      var fullName = decodeURIComponent(base64.decode(req.params.id));
      var fileName = fullName.substring(fullName.lastIndexOf('/') + 1);
      console.log("downloading ->", fullName);
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
      res.setHeader('Content-Transfer-Encoding', 'binary');
      res.cookie('downloadFile', fileName); //if (process.env.NODE_ENV === 'dev') console.log(normalize(pathPrefix + '\\' + fileName))
      //global.logger.info(`[${userName}] fileController::FileController download() ->Downloading ${path}/${fileName} size ${fileSize}`);

      res.download(fullName); //res.download(normalize(pathPrefix + '\\' + fileName), fileName)
    }
  }, {
    key: "shareFileDownload",
    value: function shareFileDownload(req, res, next) {
      var fileId = req.params.id;
      var fileRealPath = '';
      var fileName = '';
      var userName = req.cookies.UserName;
      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment(new Date()).format('x');

      var renderDownloadPage = function renderDownloadPage(d) {
        var sharedFilesContent = '';
        d.forEach(function (f, idx) {
          console.log(f.UnixDate);
          console.log(currentUnixDate);
          sharedFilesContent += "\n                <div class=\"sharedFile-item\">\n                    <span class=\"firstColItem\">".concat(f.FileName, "</span>\n                    <span class=\"colItem\">").concat(f.Size, "</span>");

          if (f.UnixDate !== 1 && f.UnixDate < currentUnixDate) {
            sharedFilesContent += "\n                        <a href = \"#\" data-title=\"El enlace ha expirado\" class=\"expirated\" id=\"expiratedLink\"><i class = \"fas fa-download expirated\" data-title=\"El enlace ha expirado\"></i></a >\n                        </div>";
          } else {
            sharedFilesContent += "\n                        <a href = \"/files/share/".concat(f.UrlCode, "\"><i class =\"fas fa-download\" ></i></a >\n                        </div>");
          }
        });
        var downloadPageHTML = "\n                        <!DOCTYPE html>\n                        <html lang = \"es\">\n                        <head>\n                            <meta charset = \"UTF-8\" >\n                            <meta name = \"viewport\" content = \"width=device-width, initial-scale=1.0\" >\n                            <meta http - equiv = \"X-UA-Compatible\" content = \"ie=edge\" >\n                            <title> Download Page</title> \n                            <link type = \"text/css\" rel = \"stylesheet\" href = \"/css/fontawesome.all.min.css\" media = \"screen,projection\">\n                            <link type = \"text/css\" rel = \"stylesheet\" href = \"/css/style.css\" media = \"screen,projection\">\n                            <link rel = \"shortcut icon\" href = \"/favicon.ico\">\n                            <link rel = \"shortcut icon\" href = \"/favicon_64.png\">\n                        </head> \n                        <body>\n                            <div class = \"row head-container\">\n                                <div class = \"container\">\n                                    <div class = \"col m3 logo\"></div> \n                                    <div class = \"col m12 center title\"> File Manager</div> \n                                    <div class = \"col m3 status right\"></div> \n                                </div> \n                            </div> \n                            <div class = \"row nav-unify\" ></div> \n                            <div class = \"row\" ></div> \n                            <form class = \"sharedFilesDownload\">\n                                <span class = \"form-title\"> Download Files </span>  \n                                <div id = \"sharedFiles-container\"> ".concat(sharedFilesContent, " </div>\n                            </form> \n                            <div class = \"footer-unify\" >\n                                <div class = \"container\" ></div> \n                            </div> \n                        </body> \n                        </html>");
        res.send(downloadPageHTML);
      };

      if (process.env.NODE_ENV === 'dev') console.log(fileId);
      Util.getById(fileId, function (d) {
        if (d.status == 'OK') {
          if (process.env.NODE_ENV === 'dev') console.log(d); //fileRealPath = d.data.RealPath

          fileName = d.data[0].FileName;
          global.logger.info(" [$ { userName }] fileController::FileController shareFileDownload() - > $ { fileName }\n                    Shared File downloaded successfully!");
          /*  Audit.Add({
               userName: userName
           }, {
               clientIP: clientIP,
               browserIP: browserIP
           }, {
               fileName: fileName,
               fileSize: 0
           }, {
               dateString: currentDate,
               unixDate: currentUnixDate
           }, normalize(pathPrefix + fileRealPath + '/' + fileName), 'Download Shared File', 'OK', () => {
               if (process.env.NODE_ENV === 'dev') console.log(result);
           }); */

          console.log(d.data.length);

          if (d.data.length > 1) {
            renderDownloadPage(d.data);
          } else {
            return res.status(200).download(normalize(pathPrefix + d.data[0].RealPath + '/' + fileName), fileName, function (err) {
              if (err) {// Actualiza Audit
              } else {// Cambia estado en DB
                }
            });
          }
        } else {
          global.logger.error(" [$ { userName }] fileController::FileController shareFileDownload() - > $ { fileName }\n                    $ { d.message }\n                    ");
          /*Audit.Add({
              userName: userName
          }, {
              clientIP: clientIP,
              browserIP: browserIP
          }, {
              fileName: '',
              fileSize: 0
          }, {
              dateString: currentDate,
              unixDate: currentUnixDate
          }, d.message, 'Download Shared File', 'FAIL', () => {
              if (process.env.NODE_ENV === 'dev') console.log(result);
          });*/

          return res.status(200).json({
            "status": "FAIL",
            "message": d.message + ".<br>Enlace no disponible.",
            "data": null
          });
        }
      });
    }
  }, {
    key: "shareFileManage",
    value: function shareFileManage(req, res, next) {
      var userName = req.params.name; //let userName = req.cookies.UserName;

      var browserIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress).split(",")[1];
      var clientIP = req.connection.remoteAddress;
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      console.log('hello');
      if (process.env.NODE_ENV === 'dev') console.log(userName);
      Util.getByUserName(userName, function (d) {
        if (process.env.NODE_ENV === 'dev') console.log(d);

        if (d.status == 'OK') {
          if (process.env.NODE_ENV === 'dev') console.log('shareFileManage->', d.data);
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, d.data, 'Share File', 'OK', function (result) {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });
          return res.status(200).json({
            "status": "OK",
            "message": "",
            "data": d.data
          });
        } else {
          Audit.Add({
            userName: userName
          }, {
            clientIP: clientIP || '',
            browserIP: browserIP || ''
          }, {
            fileName: fullName || '',
            fileSize: 0
          }, {
            dateString: currentDate,
            unixDate: currentUnixDate
          }, d.message, 'Share File', 'FAIL', function (result) {
            if (process.env.NODE_ENV === 'dev') console.log(result);
          });
          return res.status(200).json({
            "status": "FAIL",
            "message": d.message + "No hay archivos compartidos.",
            "data": null
          });
        }
      });
    }
  }, {
    key: "shareFile",
    value: function shareFile(req, res, next) {
      if (process.env.NODE_ENV === 'dev') console.log(req.get('host'));
      var fileName = req.body.fileName;
      var fileSize = req.body.fileSize;
      var path = req.body.path;
      var userName = req.body.userName;
      var destUserName = req.body.destUserName;
      var expirationDate = req.body.expirationDate;
      var deleteExpiredFile = req.body.deleteExpiredFile;
      var groupID = req.body.groupID;

      var uid = _getUID();

      var date = new Date();
      var newDate = new Date(date.setDate(date.getDate() + 1));
      if (process.env.NODE_ENV === 'dev') console.log(newDate);
      var data = {
        UrlCode: uid,
        User: userName,
        DestUser: destUserName,
        RealPath: path,
        FileName: fileName,
        Size: fileSize,
        ExpirationDate: expirationDate,
        UnixDate: moment(expirationDate).unix(),
        State: 'Pending',
        deleteExpiredFile: deleteExpiredFile,
        groupID: groupID
      };
      var sqlQuery = 'DELETE FROM Shared WHERE ((UnixDate >1 ) AND (UnixDate  < ?));';
      var currentDate = moment(new Date()).format('DD/MM/YYYY  HH:mm:ss');
      var currentUnixDate = moment().format('x');
      if (process.env.NODE_ENV === 'dev') console.log(sqlQuery);

      _cleanExpiredSharedFiles(sqlQuery, function (response) {
        if (process.env.NODE_ENV === 'dev') console.log(response);
        global.logger.info(" [$ { userName }] fileController::shareFile _cleanExpiredSharedFiles() - > $ { response.message }\n                    ");
        Util.AddSharedFiles(data, function (d) {
          if (process.env.NODE_ENV === 'dev') console.log("d : ", d);

          if (d.status === 'FAIL') {
            return res.status(200).json({
              "status": "FAIL",
              "message": d.message + ".<br>Error al crear enlace compartido.",
              "data": null
            });
          } else {
            // send email
            _sendMail(userName, destUserName, fileName, "\n                    https: //filebox.unifyspain.es/files/share/".concat(uid));

            d.data.hostServer = req.get('host');
            return res.status(200).json(d);
          }
        });
      });
    }
  }]);

  return FileController;
}();

module.exports = new FileController();
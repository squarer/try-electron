var app = require('app');
var BrowserWindow = require('browser-window');

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  var mainWindow = new BrowserWindow({
    width: 800,
    height: 650,
    'min-width': 800,
    'min-height': 650
  });

  mainWindow.loadUrl('file://' + __dirname + '/views/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

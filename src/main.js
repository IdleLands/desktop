const electron = require('electron');
const DiscordRPC = require('discord-rpc');
const startCase = require('lodash.startcase');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const Config = require('electron-config');
const config = new Config();

require('electron-debug')({ enabled: true });

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.
  const opts = { 
    show: false, 
    icon: __dirname + '/favicon.ico'
  };

  Object.assign(opts, config.get('winBounds'));

  if(!opts.height) opts.height = 768;
  if(!opts.width) opts.width = 1024;

  mainWindow = new BrowserWindow(opts);
  mainWindow.setMenu(null);

  mainWindow.once('ready-to-show', mainWindow.show);

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.on('close', () => {
    config.set('winBounds', mainWindow.getBounds())
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const DISCORD_CLIENT_ID = '393797402924023808';

DiscordRPC.register(DISCORD_CLIENT_ID);

let startTimestamp;

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const setActivity = () => {
  if(!rpc || !mainWindow) return;

  mainWindow.webContents.executeJavaScript('document.querySelector("webview").getWebContents().executeJavaScript("window.discordGlobalCharacter")')
    .then(function(char) {
      if(!char) {
        rpc.clearActivity();
        startTimestamp = null;
        return;
      }

      if(!startTimestamp) startTimestamp = new Date();

      let name = char.name;
      if(char.title) name = `${name}, the ${char.title}`;

      rpc.setActivity({
        startTimestamp,
        state: char.$party ? 'In The "' + char.$party.name + '" Party' : 'Playing Solo',
        details: 'Level ' + char.ascensionLevel + '★' + char.level.__current + ' ' + char.profession,
        largeImageKey: char._gameImage || 'game-image',
        largeImageText: name + ' (Currently In ' + char.map + ')'
      });
    });
    
};

rpc.on('ready', function() {
  setActivity();

  setInterval(function() {
    setActivity();
  }, 15000);
});

rpc
  .login({ clientId: DISCORD_CLIENT_ID })
  .catch(function(err) {
    console.error(err);
  });
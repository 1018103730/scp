import {app, BrowserWindow, ipcMain, nativeImage, clipboard, globalShortcut, Notification} from 'electron'
import path from "path";
import fs from 'fs';
import md5 from 'md5';
import moment from "moment";
import Datastore from "nedb";

// app.disableHardwareAcceleration();

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */

if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let intervalKey

//关闭窗口是否最小化
let closeWindowType = 'background';

const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`

//创建图片缓存文件夹
let initDirs = [
    path.join(app.getPath('userData'), '/caches'),
    path.join(app.getPath('userData'), '/saves')
]
for (let dir of initDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 800,
        useContentSize: true,
        width: 500,
        minWidth: 500,
        show: false
    })

    mainWindow.loadURL(winURL)

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.on('close', closeWindow);
}

function closeWindow(event) {
    if (closeWindowType === 'background') {
        //发送通知
        const NOTIFICATION_TITLE = 'Scp'
        const NOTIFICATION_BODY = '程序窗口已最小化,如需显示,可以进行一下操作:点击图标/点击通知/Shift+Ctrl+I'

        let notify = new Notification({title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY})
        notify.on('click', () => {
            mainWindow.show();
        })

        notify.show();
        mainWindow.minimize();
        event.preventDefault();
    } else {
    }
}

app.on('ready', () => {
    globalShortcut.register('Shift+Ctrl+I', () => {
        if (mainWindow) {
            mainWindow.show();
        } else {
            createWindow();
        }
    })

    intervalKey = setInterval(() => {
        let type = 'text';
        let ClipboardData;
        let filename;
        let filepath = null;

        let image = clipboard.readImage();
        if (!image.isEmpty()) {
            type = 'image';
            ClipboardData = image.toPNG();
            filename = md5(image.toDataURL());
        } else {
            //兜底
            ClipboardData = clipboard.readText();
            filename = md5(ClipboardData);
        }

        filepath = path.join(app.getPath('userData'), '/caches/' + filename + '.tmp')
        let hash = md5(filepath);

        records.count({hash: hash}, (err, count) => {
            if (count === 0) {
                let score = moment(new Date()).format('MMDDHHmmss');
                records.insert({
                    hash: hash,
                    type: type,
                    digest: type === 'text' ? ClipboardData.slice(0, 100) : '',
                    filepath: filepath,
                    score: score,
                    tags: type === 'text' ? '文字' : '图片'
                });

                //发送信息到渲染页面
                fs.writeFile(filepath, ClipboardData, 'utf-8', () => {
                    //设置文件大小
                    fs.stat(filepath, (err, stat) => {
                        //更新数据中的缓存文件大小
                        records.update({hash: hash}, {$set: {size: stat.size}}, (err, numReplaced) => {
                            //通知渲染线程刷新界面
                            if (mainWindow) {
                                mainWindow.webContents.send('refresh-records-data', 'ping');
                            }
                        })
                    })

                })
            }
        })
    }, 100)

    createWindow();
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on('set-clipboard', (err, args) => {
    if (args.type === 'image') {
        let image = nativeImage.createFromPath(args.filepath);
        clipboard.writeImage(image);
    } else {
        fs.readFile(args.filepath, 'utf-8', (err, data) => {
            clipboard.writeText(data);
        });
    }
});


let recordsDBFilename = path.join(app.getPath('userData'), '/saves/scp_records.db')
const records = new Datastore({
    autoload: true,
    timestampData: true,
    filename: recordsDBFilename
});

ipcMain.on('change-close-window-type', (err, args) => {
    closeWindowType = args.type;
    console.log(closeWindowType);
});

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
*/

import {app, BrowserWindow, ipcMain, nativeImage, clipboard, globalShortcut, Notification} from 'electron'
import path from "path";
import fs from 'fs';
import md5 from 'md5';
import moment from "moment";
import Datastore from "nedb";

const StrLimit = 800;

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

    mainWindow.on('show', () => {
        mainWindow.webContents.send('focus-search-input', 'ping');
    })
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

//提取md5因子 用于减轻计算量
function getMd5Factor(data) {
    let len = parseInt(data.length);

    //长度小于指定长度 不做hash因子提取
    if (len <= StrLimit) {
        return data;
    }

    let hashMLen = parseInt(StrLimit / 8)

    let start = [0, hashMLen * 2];
    let middle = [parseInt(len / 2) - hashMLen, parseInt(len / 2) + hashMLen];
    let end = [len - hashMLen * 2, len];

    return data.slice(...start) + data.slice(...middle) + data.slice(...end);
}

//开机自启
let settingsDBFilename = path.join(app.getPath('userData'), '/saves/scp_settings.db')
const settings = new Datastore({
    autoload: true,
    timestampData: true,
    filename: settingsDBFilename
});
settings.findOne({}, (err, data) => {
    if (data && data.is_auto_run === "1") {
        app.setLoginItemSettings({
            openAtLogin: true, // Boolean 在登录时启动应用
            openAsHidden: true, // Boolean (可选) mac 表示以隐藏的方式启动应用。~~~~
        });
    }
})

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
            filename = md5(getMd5Factor(image.toDataURL()));
        } else {
            //兜底
            ClipboardData = clipboard.readText();
            filename = md5(getMd5Factor(ClipboardData));
        }

        //剪切板无内容,不触发记录的逻辑
        if (ClipboardData.length <= 0) return;

        filepath = path.join(app.getPath('userData'), '/caches/' + filename + '.tmp')
        let hash = filename;

        records.count({hash: hash}, (err, count) => {
            if (count === 0) {
                let score = moment(new Date()).format('MMDDHHmmss');
                records.insert({
                    hash: hash,
                    type: type,
                    digest: type === 'text' ? ClipboardData.slice(0, StrLimit) : '',
                    filepath: ClipboardData.length >= StrLimit ? filepath : null,
                    score: score,
                    tags: type === 'text' ? '文字' : '图片',
                    reuse_time: 0,
                    has_tmp_file: false
                });

                //图案或者文字超标才会写入缓存文件
                if (type === 'image' || ClipboardData.length >= StrLimit) {
                    //发送信息到渲染页面
                    fs.writeFile(filepath, ClipboardData, 'utf-8', () => {
                        //设置文件大小
                        fs.stat(filepath, (err, stat) => {
                            //更新数据中的缓存文件大小
                            records.update({hash: hash}, {
                                $set: {
                                    size: stat.size,
                                    has_tmp_file: true
                                }
                            }, (err, numReplaced) => {
                                //通知渲染线程刷新界面
                                if (mainWindow) {
                                    mainWindow.webContents.send('refresh-records-data', 'ping');
                                }
                            })
                        })
                    })
                } else {
                    if (mainWindow) {
                        mainWindow.webContents.send('refresh-records-data', 'ping');
                    }
                }
            }
        })
    }, 200)

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
        if (args.hash_tmp_file) {
            fs.readFile(args.filepath, 'utf-8', (err, data) => {
                clipboard.writeText(data);
            });
        } else {
            clipboard.writeText(args.digest);
        }
    }
});


let recordsDBFilename = path.join(app.getPath('userData'), '/saves/scp_records.db')
const records = new Datastore({
    autoload: true,
    timestampData: true,
    filename: recordsDBFilename
});

//切换不同的窗口关闭方式
ipcMain.on('change-close-window-type', (err, args) => {
    closeWindowType = args.type;
});

ipcMain.on('min-window', (err, args) => {
    if (mainWindow) {
        mainWindow.minimize();
    }
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

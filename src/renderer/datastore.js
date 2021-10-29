import Datastore from 'nedb'
import path from 'path'
import {remote} from 'electron'
import crypto from 'crypto'

let secret = 'miya';

let recordsDBFilename = path.join(remote.app.getPath('userData'), '/scp_records.db')
let settingsDBFilename = path.join(remote.app.getPath('userData'), '/scp_settings.db')

const records = new Datastore({
    autoload: true,
    timestampData: true,
    filename: recordsDBFilename,
    // afterSerialization(doc) {
    //     let cipher = crypto.createCipher('aes192', secret);
    //     let enc = cipher.update(doc, 'utf8', 'hex')
    //     enc += cipher.final('hex')
    //
    //     return enc
    // },
    // beforeDeserialization(doc) {
    //     let decipher = crypto.createDecipher('aes192', secret);
    //     let dec = decipher.update(doc, 'hex', 'utf8');
    //     dec += decipher.final('utf8');
    //
    //     return dec;
    // }
})
//
records.ensureIndex({fieldName: 'hash', unique: true}, (err) => {
})

const settings = new Datastore({
    autoload: true,
    timestampData: true,
    filename: settingsDBFilename
})

export default {records: records, settings: settings}

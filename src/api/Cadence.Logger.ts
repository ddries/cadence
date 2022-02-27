import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Cadence from '../Cadence';

export default class Logger {

    private _prefix: string = "";
    private _fileName: string = "";

    constructor(prefix: string, fileName: string = "") {
        this._prefix = prefix;
        this._fileName = fileName;

        // if (this._fileName.length > 0) {
        //     fs.writeFile(path.join(Cadence.BaseLogDir, this._fileName), '', () => { });
        // }
    }

    public log(text: string, explicitLogBlock: boolean = false): void {
        let _logText = this.getFormattedTimestamp() + " ";

        if (this._prefix.length > 0)
            _logText += "[" + this._prefix + "] ";

        _logText += "[" + this.getLogId(_logText + text).substr(0, 10) + "] ";

        _logText += text;

        console.log(_logText);

        if (this._fileName.length > 0 && !explicitLogBlock) {
            fs.appendFile(path.join(Cadence.BaseLogDir, this._fileName), _logText + "\n",  () => { });
        }
    }

    private getLogId(log: string): string {
        return crypto.createHash('md5').update(log).digest('hex');
    }

    private getFormattedTimestamp(): string {
        const d: Date = new Date(Date.now());
        return "[" + d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear() + " | " + (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ":" + (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()) + ":" + (d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds()) + "]";
    }

}
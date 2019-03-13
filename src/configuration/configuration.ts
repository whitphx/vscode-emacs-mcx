import * as vscode from "vscode";
import { IConfiguration } from "./iconfiguration";

export class Configuration implements IConfiguration, vscode.Disposable {
    /**
     * Configuration uses singleton pattern.
     */
    public static get instance(): Configuration {
        return this.inst;
    }

    public static initialize(context: vscode.ExtensionContext) {
        if (this.inst) {
            return;
        }

        this.inst = new Configuration();
        context.subscriptions.push(this.inst);
    }

    private static inst: Configuration;

    /**
     * Config fields
     */

    public killRingMax = 60;

    /**
     * Instance methods
     */

    private constructor() {
        this.reload();
    }

    public dispose() {
        // Now nothing to be done.
    }

    private reload() {
        const emacsConfigs = vscode.workspace.getConfiguration("emacs-mcx");

        /* tslint:disable:forin */
        // Disable forin rule here as we make accessors enumerable.`
        for (const option in this) {
            const val = emacsConfigs[option] as any;
            if (val !== null && val !== undefined) {
                // This code is copied from VSCodeVim/Vim, but now not necessary for this extension.
                // if (val.constructor.name === Object.name) {
                //     val = Configuration.unproxify(val);
                // }
                this[option] = val;
            }
        }
    }
}

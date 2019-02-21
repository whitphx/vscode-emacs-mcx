import { MessageManager } from "./message";

export class PrefixArgumentHandler {
    private isInPrefixArgumentMode = false;
    private isAcceptingPrefixArgument = false;
    private cuCount = 0;  // How many C-u are input continuously
    private prefixArgumentStr = "";  // Prefix argument string input after C-u

    public handleType(text: string): boolean {
        if (!this.isInPrefixArgumentMode) {
            return false;
        }

        if (this.isAcceptingPrefixArgument && !isNaN(+text)) {
            // If `text` is a numeric charactor
            this.prefixArgumentStr += text;
            MessageManager.showMessage(`C-u ${this.prefixArgumentStr}-`);
            return true;
        }

        return false;
    }

    /**
     * Emacs' ctrl-u
     */
    public universalArgument() {
        if (this.isInPrefixArgumentMode && this.prefixArgumentStr.length > 0) {
            this.isAcceptingPrefixArgument = false;
        } else {
            this.isInPrefixArgumentMode = true;
            this.isAcceptingPrefixArgument = true;
            this.cuCount++;
            this.prefixArgumentStr = "";
        }
    }

    public cancel() {
        this.isInPrefixArgumentMode = false;
        this.isAcceptingPrefixArgument = false;
        this.cuCount = 0;
        this.prefixArgumentStr = "";
    }

    public getPrefixArgument(): number | undefined {
        if (!this.isInPrefixArgumentMode) { return undefined; }

        const prefixArgument = parseInt(this.prefixArgumentStr, 10);
        if (isNaN(prefixArgument)) {
            return 4 ** this.cuCount;
        }
        return prefixArgument;
    }
}

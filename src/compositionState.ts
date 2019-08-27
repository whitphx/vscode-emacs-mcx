import * as vscode from "vscode";
import { logger } from "./logger";

export class CompositionState {
  private firstTypeInCompositionOccured: boolean = false;
  private replacePreviousCharQueue: Array<{args: any}> = [];

  public startComposition() {
    this.firstTypeInCompositionOccured = false;
  }

  public type() {
    this.firstTypeInCompositionOccured = true;
  }

  public replacePreviousChar(args: any) {
    if (!this.firstTypeInCompositionOccured) {
      this.enqueueReplacePreviousChar(args);
    } else {
      vscode.commands.executeCommand("default:replacePreviousChar", args);
    }
  }

  private enqueueReplacePreviousChar(args: any) {
    this.replacePreviousCharQueue.push(args);
    logger.info("enqueueReplacePreviousChar " + JSON.stringify(this.replacePreviousCharQueue));
    // TODO: Consume queued "replacePreviousChar" invokations AFTER this.firstTypeInCompositionOccured become true.
  }
}

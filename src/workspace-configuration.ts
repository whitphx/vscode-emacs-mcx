import * as vscode from "vscode";

/**
 * Load and synchronize a specific the workspace configuration section to the .data property.
 */
export class WorkspaceConfigSectionCache implements vscode.Disposable {
  private _data: vscode.WorkspaceConfiguration;
  public get data(): vscode.WorkspaceConfiguration {
    return this._data;
  }

  private eventListenerDisposable: vscode.Disposable;

  constructor(section: string) {
    this._data = vscode.workspace.getConfiguration(section);

    this.eventListenerDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(section)) {
        this._data = vscode.workspace.getConfiguration(section);
      }
    }, this);
  }

  public dispose(): void {
    this.eventListenerDisposable.dispose();
  }
}

export class WorkspaceConfigCache implements vscode.Disposable {
  // Singleton pattern
  public static get instance(): WorkspaceConfigCache {
    if (!this.inst) {
      this.inst = new WorkspaceConfigCache();
    }

    return this.inst;
  }
  private static inst: WorkspaceConfigCache;

  private configSections: { [section: string]: WorkspaceConfigSectionCache } = {};

  public get(section: string): vscode.WorkspaceConfiguration {
    const cachedConfigSection = this.configSections[section];
    if (cachedConfigSection != null) {
      return cachedConfigSection.data;
    }

    const configSection = new WorkspaceConfigSectionCache(section);
    this.configSections[section] = configSection;
    return configSection.data;
  }

  public static get(section: string): vscode.WorkspaceConfiguration {
    return this.instance.get(section);
  }

  public dispose(): void {
    for (const configSection of Object.values(this.configSections)) {
      configSection.dispose();
    }
  }
}

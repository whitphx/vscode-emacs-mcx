import assert from "assert";
import * as vscode from "vscode";
import { Configuration } from "../../configuration/configuration";

interface MockWorkspaceConfig {
  get(key: string): unknown;
}

suite("Configuration", () => {
  test("validates killRingMax configuration", () => {
    const config = Configuration.instance;
    const mockConfig: MockWorkspaceConfig = {
      get: (key: string): number | undefined => {
        if (key === "killRingMax") return -1;
        return undefined;
      },
    };

    // Mock workspace configuration
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (): vscode.WorkspaceConfiguration =>
      mockConfig as vscode.WorkspaceConfiguration;

    try {
      // Access configuration to trigger validation
      assert.throws(() => {
        void config.killRingMax;
      }, /killRingMax must be a positive integer/);
    } finally {
      // Restore mock
      vscode.workspace.getConfiguration = originalGetConfiguration;
    }
  });

  test("validates debug configuration", () => {
    const config = Configuration.instance;
    const mockConfig: MockWorkspaceConfig = {
      get: (key: string): Record<string, unknown> | undefined => {
        if (key === "debug") return { silent: "not-a-boolean", loggingLevelForAlert: "invalid" };
        return undefined;
      },
    };

    // Mock workspace configuration
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (): vscode.WorkspaceConfiguration =>
      mockConfig as vscode.WorkspaceConfiguration;

    try {
      // Access configuration to trigger validation
      assert.throws(() => {
        void config.debug;
      }, /debug.silent must be a boolean/);
    } finally {
      // Restore mock
      vscode.workspace.getConfiguration = originalGetConfiguration;
    }
  });
});

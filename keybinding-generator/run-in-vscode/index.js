import fsPromises from "node:fs/promises";
import path from "node:path";

// This file is supposed to run in the VS Code environment to fetch the default keybindings
// by using the VS Code API.

export async function run() {
  console.log("This function is running in VS Code environment.");

  const vscode = await import("vscode");

  const uri = vscode.Uri.from({
    scheme: "vscode",
    authority: "defaultsettings",
    path: "/keybindings.json",
  });
  const doc = await vscode.workspace.openTextDocument(uri);
  const content = doc.getText();

  const outputDir = path.join(import.meta.dirname, "../.tmp");
  await fsPromises.mkdir(outputDir, { recursive: true });
  await fsPromises.writeFile(path.join(outputDir, "vsc-default-keybindings.json"), content, "utf8");
}

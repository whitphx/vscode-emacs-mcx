import fsPromises from "node:fs/promises";

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
  await fsPromises.writeFile("vsc-default-keybindings.json", content, "utf8");
}

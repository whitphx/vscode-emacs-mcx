import assert from "assert";
import * as vscode from "vscode";
import { Position } from "vscode";
import { travelForward, travelBackward } from "../../../../commands/helpers/paragraph";

suite("travelForward", () => {
  const text = "aaa\nbbb\n\nccc\nddd\n\neee\nfff";
  const testcases: { cur: Position; next: Position }[] = [
    {
      cur: new Position(0, 0),
      next: new Position(2, 0),
    },
    {
      cur: new Position(1, 0),
      next: new Position(2, 0),
    },
    {
      cur: new Position(1, 3),
      next: new Position(2, 0),
    },
    {
      cur: new Position(2, 0),
      next: new Position(5, 0),
    },
    {
      cur: new Position(3, 0),
      next: new Position(5, 0),
    },
    {
      cur: new Position(3, 3),
      next: new Position(5, 0),
    },
    {
      cur: new Position(5, 0),
      next: new Position(7, 3),
    },
    {
      cur: new Position(6, 0),
      next: new Position(7, 3),
    },
    {
      cur: new Position(7, 3),
      next: new Position(7, 3),
    },
  ];
  testcases.forEach(({ cur, next }) => {
    test(`it transforms ${JSON.stringify(cur)} to ${JSON.stringify(next)}, with text ${JSON.stringify(
      text,
    )}`, async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: text,
      });

      assert.ok(travelForward(doc, cur).isEqual(next));
    });
  });
});

suite("travelBackward", () => {
  const text = "aaa\nbbb\n\nccc\nddd\n\neee\nfff";
  const testcases: { cur: Position; next: Position }[] = [
    {
      cur: new Position(0, 0),
      next: new Position(0, 0),
    },
    {
      cur: new Position(1, 0),
      next: new Position(0, 0),
    },
    {
      cur: new Position(1, 3),
      next: new Position(0, 0),
    },
    {
      cur: new Position(2, 0),
      next: new Position(0, 0),
    },
    {
      cur: new Position(3, 0),
      next: new Position(2, 0),
    },
    {
      cur: new Position(3, 3),
      next: new Position(2, 0),
    },
    {
      cur: new Position(5, 0),
      next: new Position(2, 0),
    },
    {
      cur: new Position(6, 0),
      next: new Position(5, 0),
    },
    {
      cur: new Position(7, 3),
      next: new Position(5, 0),
    },
  ];
  testcases.forEach(({ cur, next }) => {
    test(`it transforms ${JSON.stringify(cur)} to ${JSON.stringify(next)}, with text ${JSON.stringify(
      text,
    )}`, async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: text,
      });

      assert.ok(travelBackward(doc, cur).isEqual(next));
    });
  });
});

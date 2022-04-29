import { Range } from "vscode";
import { IKillRingEntity } from "./kill-ring-entity";

export enum AppendDirection {
  Forward,
  Backward,
}

interface IRegionText {
  text: string;
  range: Range;
}

class AppendedRegionTexts {
  /**
   * This class represents a sequence of IRegionTexts appended by kill command.
   * Each element come from one cursor (selection) at single kill.
   */
  private regionTexts: IRegionText[];

  constructor(regionText: IRegionText) {
    this.regionTexts = [regionText];
  }

  public append(another: AppendedRegionTexts, appendDirection: AppendDirection = AppendDirection.Forward) {
    if (appendDirection === AppendDirection.Forward) {
      this.regionTexts = this.regionTexts.concat(another.regionTexts);
    } else {
      this.regionTexts = another.regionTexts.concat(this.regionTexts);
    }
  }

  public isEmpty() {
    return this.regionTexts.every((regionText) => regionText.text === "");
  }

  public getAppendedText(): string {
    return this.regionTexts.map((regionText) => regionText.text).join("");
  }

  public getLastRange(): Range {
    return this.regionTexts[this.regionTexts.length - 1]!.range; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }
}

export class EditorTextKillRingEntity implements IKillRingEntity {
  public readonly type = "editor";
  private regionTextsList: AppendedRegionTexts[];

  constructor(regionTexts: IRegionText[]) {
    this.regionTextsList = regionTexts.map((regionText) => new AppendedRegionTexts(regionText));
  }

  public isSameClipboardText(clipboardText: string): boolean {
    return this.asString() === clipboardText;
  }

  public isEmpty(): boolean {
    return this.regionTextsList.every((regionTexts) => regionTexts.isEmpty());
  }

  // TODO: Cache the result of this method because it is called repeatedly
  public asString(): string {
    const appendedTexts = this.regionTextsList.map((appendedRegionTexts) => ({
      range: appendedRegionTexts.getLastRange(),
      text: appendedRegionTexts.getAppendedText(),
    }));

    const sortedAppendedTexts = appendedTexts.sort((a, b) => {
      if (a.range.start.line === b.range.start.line) {
        return a.range.start.character - b.range.start.character;
      } else {
        return a.range.start.line - b.range.start.line;
      }
    });

    let allText = "";
    sortedAppendedTexts.forEach((item, i) => {
      const prevItem = sortedAppendedTexts[i - 1];
      if (prevItem && prevItem.range.start.line !== item.range.start.line) {
        allText += "\n" + item.text;
      } else {
        allText += item.text;
      }
    });

    return allText;
  }

  public getRegionTextsList() {
    return this.regionTextsList;
  }

  public append(entity: EditorTextKillRingEntity, appendDirection: AppendDirection = AppendDirection.Forward) {
    const additional = entity.getRegionTextsList();
    if (additional.length !== this.regionTextsList.length) {
      throw Error("Not appendable");
    }

    this.regionTextsList.map(
      // `additional.length === this.regionTextsList.length` has already been checked,
      // so noUncheckedIndexedAccess rule can be skipped here.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (appendedRegionTexts, i) => appendedRegionTexts.append(additional[i]!, appendDirection)
    );
  }
}

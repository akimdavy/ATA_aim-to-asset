# ATA_aim-to-asset
targest asset for attchment shapes
# ATA — Aim to Asset

ATA (Aim to Asset) is an extension for [Owlbear Rodeo](https://www.owlbear.rodeo/) that allows you to attach customizable shapes to image assets and use them as visual markers or damage targets.

## Features

- Attach shapes directly to image assets
- Supported shapes:
  - Circle
  - Rectangle
  - Triangle
  - Hexagon
- Custom outline color
- Adjustable line width
- Adjustable dashed outline
- Adjustable shape size
- Shapes move together with the asset they are attached to
- Multiple shapes can be attached to the same asset
- Delete shapes from a selected asset (select asset and click after shift+(this button))
- Delete all ATA shapes from the scene

## Dice+ and Forge Damage Integration

ATA can listen to roll results from the Dice+ extension to damage in Forge.

When a valid damage roll is detected:

1. ATA finds all tokens that have ATA shapes attached to them.
2. The Dice+ result is treated as damage.
3. Temporary HP is reduced first.
4. Remaining damage is subtracted from normal HP.
5. HP cannot fall below 0.

Any roll containing a `d20` is ignored.

Examples:

```text
1d20 + 3       → ignored
1d20 + 2d6     → ignored
2d20kh1 + 7    → ignored

1d6 + 3        → damage
2d8 + 5        → damage
3d6 + 1d4      → damage

import OBR, {
  buildShape,
  isImage
} from "@owlbear-rodeo/sdk";


// --------------------------------------------------
// ID расширения
// --------------------------------------------------

const ID = "com.Knight.asset-shape";
const BASE_URL = import.meta.env.BASE_URL;

const TOOL_ID = `${ID}/tool`;
const MODE_ID = `${ID}/mode`;
const ACTION_ID = `${ID}/shape-action`;
const POPOVER_ID = `${ID}/shape-picker`;


// --------------------------------------------------
// Metadata
// --------------------------------------------------

const OVERLAY_KEY = `${ID}/overlay`;
const TARGET_KEY = `${ID}/target`;
const SHAPE_KEY = `${ID}/shapeType`;
const ERASE_SELECTED_ACTION_ID = `${ID}/erase-selected`;
const CLEAR_ALL_ACTION_ID =`${ID}/clear-all`;


// --------------------------------------------------
// Допустимые фигуры
// --------------------------------------------------

const SHAPE_TYPES = [
  "CIRCLE",
  "RECTANGLE",
  "TRIANGLE",
  "HEXAGON"
];
// --------------------------------------------------
// Dice+ → урон по токенам с нашими фигурами
// --------------------------------------------------

const ROLL_RESULT_CHANNEL =
  "dice-plus/roll-result";

const HP_KEY =
  "com.battle-system.forge/Z005";

const TEMP_HP_KEY =
  "com.battle-system.forge/Z042";


// --------------------------------------------------
// Проверка: есть ли в броске хотя бы один d20
// --------------------------------------------------

function hasD20(groups) {

  if (!Array.isArray(groups)) {
    return false;
  }

  return groups.some((group) => {

    // Dice+ может указывать тип на уровне группы
    if (
      String(group?.diceType).toLowerCase() === "d20"
    ) {
      return true;
    }


    // Дополнительная проверка отдельных костей
    if (!Array.isArray(group?.dice)) {
      return false;
    }

    return group.dice.some(
      (die) =>
        String(die?.diceType).toLowerCase() === "d20"
    );
  });
}


// --------------------------------------------------
// Получить токены, к которым прикреплены наши фигуры
// --------------------------------------------------

async function getShapeTargetIds() {

  const shapes =
    await OBR.scene.items.getItems(
      (item) =>
        item.type === "SHAPE" &&
        item.metadata?.[OVERLAY_KEY] === true &&
        typeof item.attachedTo === "string"
    );


  const targetIds =
    shapes.map(
      (shape) => shape.attachedTo
    );


  // Если на одном токене несколько фигур,
  // урон всё равно наносится только один раз
  return [...new Set(targetIds)];
}


// --------------------------------------------------
// Нанести урон
// --------------------------------------------------

async function applyDamageFromDicePlus(damage) {

  if (
    !Number.isFinite(damage) ||
    damage <= 0
  ) {
    return;
  }


  const targetIds =
    await getShapeTargetIds();


  if (targetIds.length === 0) {

    console.log(
      "[Asset Shape] Нет токенов с фигурами."
    );

    return;
  }


  await OBR.scene.items.updateItems(
    targetIds,
    (items) => {

      for (const item of items) {

        const rawHp =
          item.metadata?.[HP_KEY];

        const rawTempHp =
          item.metadata?.[TEMP_HP_KEY];


        const currentHp =
          Number(rawHp);

        // Если у объекта вообще нет HP Forge,
        // это не подходящая цель
        if (!Number.isFinite(currentHp)) {
          continue;
        }


        // Отсутствующие временные HP считаем нулём
        const parsedTempHp =
          Number(rawTempHp);

        const currentTempHp =
          Number.isFinite(parsedTempHp)
            ? Math.max(0, parsedTempHp)
            : 0;


        // ------------------------------------------
        // 1. Сначала поглощают Temporary HP
        // ------------------------------------------

        const absorbedByTemp =
          Math.min(
            currentTempHp,
            damage
          );


        const nextTempHp =
          currentTempHp - absorbedByTemp;


        // ------------------------------------------
        // 2. Остаток идёт в обычные HP
        // ------------------------------------------

        const remainingDamage =
          damage - absorbedByTemp;


        const nextHp =
          Math.max(
            0,
            currentHp - remainingDamage
          );


        // ------------------------------------------
        // Сохраняем тип значения Forge
        // ------------------------------------------

        item.metadata = {
          ...item.metadata,

          [TEMP_HP_KEY]:
            typeof rawTempHp === "string"
              ? String(nextTempHp)
              : nextTempHp,

          [HP_KEY]:
            typeof rawHp === "string"
              ? String(nextHp)
              : nextHp
        };


        console.log(
          `[Asset Shape] ${item.name}: ` +
          `damage=${damage}, ` +
          `tempHP ${currentTempHp}→${nextTempHp}, ` +
          `HP ${currentHp}→${nextHp}`
        );
      }
    }
  );
}


// --------------------------------------------------
// Запустить прослушивание Dice+
// --------------------------------------------------

function startDicePlusDamageListener() {

  const unsubscribe =
    OBR.broadcast.onMessage(
      ROLL_RESULT_CHANNEL,
      async (event) => {

        try {

          const payload =
            event.data;

          const result =
            payload?.result;

          const groups =
            result?.groups;


          if (
            !result ||
            !Array.isArray(groups)
          ) {
            return;
          }


          // ----------------------------------------
          // Любой бросок, содержащий d20,
          // полностью игнорируется
          // ----------------------------------------

          if (hasD20(groups)) {

            console.log(
              "[Asset Shape] Бросок содержит d20 — пропущен."
            );

            return;
          }


          // ----------------------------------------
          // Итог Dice+ становится уроном
          // ----------------------------------------

          const damage =
            Number(result.totalValue);


          if (
            !Number.isFinite(damage) ||
            damage <= 0
          ) {

            console.log(
              "[Asset Shape] Некорректный урон — пропущен."
            );

            return;
          }


          console.log(
            `[Asset Shape] Dice+ damage: ${damage}`
          );


          await applyDamageFromDicePlus(
            damage
          );

        } catch (error) {

          console.error(
            "[Asset Shape] Ошибка Dice+:",
            error
          );
        }
      }
    );


  console.log(
    `[Asset Shape] Listening on ${ROLL_RESULT_CHANNEL}`
  );


  return unsubscribe;
}

// --------------------------------------------------
// Получить выбранную фигуру
// --------------------------------------------------

function getSelectedShape(metadata) {
  const value = metadata.shapeType;

  if (
    typeof value === "string" &&
    SHAPE_TYPES.includes(value)
  ) {
    return value;
  }

  return "CIRCLE";
}


// --------------------------------------------------
// Удалить старую фигуру с этого ассета
// --------------------------------------------------

/*async function removeOldShape(assetId) {

  const oldShapes = await OBR.scene.items.getItems(
    (item) =>
      item.type === "SHAPE" &&
      item.metadata?.[OVERLAY_KEY] === true &&
      item.metadata?.[TARGET_KEY] === assetId
  );

  if (oldShapes.length === 0) {
    return;
  }

  const ids = oldShapes.map((item) => item.id);

  await OBR.scene.items.deleteItems(ids);
}*/

// --------------------------------------------------
// Удалить удаление фигур с выбранного ассета
// --------------------------------------------------
async function eraseSelectedAssetShapes() {

  const selection =
    await OBR.player.getSelection();

  if (
    !selection ||
    selection.length === 0
  ) {
    await OBR.notification.show(
      "Сначала выберите ассет"
    );

    return;
  }


  const selectedIds =
    new Set(selection);


  const shapes =
    await OBR.scene.items.getItems(
      (item) =>
        item.type === "SHAPE" &&
        item.metadata?.[OVERLAY_KEY] === true &&
        selectedIds.has(
          item.metadata?.[TARGET_KEY]
        )
    );


  if (shapes.length === 0) {

    await OBR.notification.show(
      "На выбранном ассете нет фигур"
    );

    return;
  }


  await OBR.scene.items.deleteItems(
    shapes.map(
      (item) => item.id
    )
  );


  await OBR.notification.show(
    "Фигуры с выбранного ассета удалены"
  );
}
// --------------------------------------------------
//  удаление фигур с всего поля
// --------------------------------------------------
async function clearAllShapes() {

  const shapes =
    await OBR.scene.items.getItems(
      (item) =>
        item.type === "SHAPE" &&
        item.metadata?.[OVERLAY_KEY] === true
    );


  if (shapes.length === 0) {

    await OBR.notification.show(
      "На сцене нет фигур"
    );

    return;
  }


  await OBR.scene.items.deleteItems(
    shapes.map(
      (item) => item.id
    )
  );


  await OBR.notification.show(
    "Все фигуры удалены"
  );
}
// --------------------------------------------------
// Создать фигуру поверх ассета
// --------------------------------------------------

async function applyShapeToAsset(
  asset,
  shapeType,
  strokeColor,
  strokeWidth,
  dashLength,
  dashGap,
  shapeScale,
  linkSizeToAsset,
  fixedShapeSize
) {

  // Сначала удаляем предыдущую фигуру,
  // созданную нашим расширением на этом ассете
  // await removeOldShape(asset.id);

  const sceneDpi =
    await OBR.scene.grid.getDpi();

  const imageDpi =
    asset.grid?.dpi || sceneDpi;


  // Реальный базовый размер ассета на сцене
  const assetBaseWidth =
    (asset.image.width / imageDpi) * sceneDpi;

  const assetBaseHeight =
    (asset.image.height / imageDpi) * sceneDpi;


  // Размер нашей фигуры
  const shapeWidth = linkSizeToAsset
    ? assetBaseWidth * shapeScale
    : fixedShapeSize;

  const shapeHeight = linkSizeToAsset
    ? assetBaseHeight * shapeScale
    : fixedShapeSize;


  const shapeItemScale = linkSizeToAsset
    ? {
        x: asset.scale.x,
        y: asset.scale.y
      }
    : {
        x: 1,
        y: 1
      };
  const shape = buildShape()

    // Имя объекта
    .name(`Asset Shape - ${shapeType}`)

    // Размер соответствует исходному изображению
    .width(shapeWidth)
    .height(shapeHeight)

    // Тип фигуры
    .shapeType(shapeType)

    // Та же позиция
    .position({
      x: asset.position.x,
      y: asset.position.y
    })

    // Тот же поворот
    .rotation(asset.rotation)

    .scale(shapeItemScale)

    // Тот же масштаб
    .scale({
      x: asset.scale.x,
      y: asset.scale.y
    })

    // Без заливки
    //.fillColor("#ff3b30")
    .fillOpacity(0)

    // Пунктирный контур
    .strokeColor(strokeColor)
    .strokeOpacity(1)
    .strokeColor(strokeColor)
    .strokeOpacity(1)
    .strokeWidth(strokeWidth)
    .strokeDash([
      dashLength,
      dashGap
    ])

    // Слой вложений
    .layer("ATTACHMENT")

    // Привязываем фигуру к ассету
    .attachedTo(asset.id)

    // Блокируем саму фигуру
    .locked(true)

    // Фигура не должна перехватывать мышь
    .disableHit(true)

    // Служебные metadata
    .metadata({
      [OVERLAY_KEY]: true,
      [TARGET_KEY]: asset.id,
      [SHAPE_KEY]: shapeType
    })

    .build();


  // Добавляем на сцену
  await OBR.scene.items.addItems([shape]);


  await OBR.notification.show(
    `Добавлена фигура: ${shapeType}`
  );
}


// --------------------------------------------------
// Tool Mode
// --------------------------------------------------

async function createMode() {

  await OBR.tool.createMode({

    id: MODE_ID,

    icons: [
      {
        icon: `${BASE_URL}icon.svg`,
        label: "Apply Shape",

        filter: {
          activeTools: [TOOL_ID]
        }
      }
    ],
    


    // ----------------------------------------------
    // Клик по сцене
    // ----------------------------------------------

    async onToolClick(context, event) {

      const target = event.target;


      // Если кликнули по пустому месту
      if (!target) {

        await OBR.notification.show(
          "Нужно нажать на ассет"
        );

        return false;
      }


      // Работаем только с изображениями Owlbear
      if (!isImage(target)) {

        await OBR.notification.show(
          "Этот объект не является изображением"
        );

        return false;
      }


      // Получаем выбранную фигуру
      const shapeType =
        getSelectedShape(context.metadata);

      const strokeColor =
        getSelectedColor(context.metadata);

      const strokeWidth =
        getStrokeWidth(context.metadata);

      const dashLength =
        getDashLength(context.metadata);

      const dashGap =
        getDashGap(context.metadata);

      const shapeScale =
        getShapeScale(context.metadata);

      const linkSizeToAsset =
        getLinkSizeToAsset(context.metadata);

      const fixedShapeSize =
        getFixedShapeSize(context.metadata);

      await applyShapeToAsset(
        target,
        shapeType,
        strokeColor,
        strokeWidth,
        dashLength,
        dashGap,
        shapeScale,
        linkSizeToAsset,
        fixedShapeSize
      );


      // false запрещает стандартное действие Owlbear
      // для этого клика
      return false;
    }
  });
}


// --------------------------------------------------
// Основной Tool
// --------------------------------------------------
function getSelectedColor(metadata) {
  const value = metadata.strokeColor;

  if (
    typeof value === "string" &&
    value.length > 0
  ) {
    return value;
  }

  return "#ff3b30";
}
// --------------------------------------------------
// Настройка Полос
// --------------------------------------------------
function getStrokeWidth(metadata) {
  const value = Number(metadata.strokeWidth);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return 6;
}
// --------------------------------------------------
// контроль размера
// --------------------------------------------------
function getShapeScale(metadata) {
  const value = Number(metadata.shapeScale);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return 1;
}

function getLinkSizeToAsset(metadata) {
  return metadata.linkSizeToAsset !== false;
}


function getFixedShapeSize(metadata) {
  const value = Number(metadata.fixedShapeSize);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return 200;
}

function getDashLength(metadata) {
  const value = Number(metadata.dashLength);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return 24;
}


function getDashGap(metadata) {
  const value = Number(metadata.dashGap);

  if (Number.isFinite(value) && value >= 0) {
    return value;
  }

  return 12;
}
async function createTool() {

  await OBR.tool.create({

    id: TOOL_ID,

    icons: [
      {
        icon: `${BASE_URL}icon.svg`,
        label: "Asset Shape"
      }
    ],

    // Наш режим активируется автоматически
    defaultMode: MODE_ID,

    // Начальные настройки
    defaultMetadata: {
      shapeType: "CIRCLE",
      strokeColor: "#ff3b30",

      strokeWidth: 6,
      dashLength: 24,
      dashGap: 12,
      shapeScale: 1,

      fixedShapeSize: 200


    }
  });
}


// --------------------------------------------------
// Tool Action
// --------------------------------------------------

async function createAction() {

  await OBR.tool.createAction({

    id: ACTION_ID,

    icons: [
      {
        icon: `${BASE_URL}icon.svg`,
        label: "Choose Shape",

        filter: {
          activeTools: [TOOL_ID]
        }
      }
    ],


    // ----------------------------------------------
    // Открываем выбор фигуры
    // ----------------------------------------------

    onClick(_, elementId) {

      OBR.popover.open({

        id: POPOVER_ID,

        url: `${BASE_URL}shape-picker.html`,

        width: 220,
        height: 480,

        anchorElementId: elementId,

        anchorOrigin: {
          horizontal: "CENTER",
          vertical: "BOTTOM"
        },

        transformOrigin: {
          horizontal: "CENTER",
          vertical: "TOP"
        }
      });
    }
  });
}
async function createEraseSelectedAction() {

  await OBR.tool.createAction({

    id: ERASE_SELECTED_ACTION_ID,

    icons: [
      {
        icon: `${BASE_URL}erase.svg`,
        label: "Erase Selected",

        filter: {
          activeTools: [TOOL_ID]
        }
      }
    ],

    async onClick() {

      await eraseSelectedAssetShapes();

    }
  });
}
async function createClearAllAction() {

  await OBR.tool.createAction({

    id: CLEAR_ALL_ACTION_ID,

    icons: [
      {
        icon: `${BASE_URL}trash.svg`,
        label: "Clear All",

        filter: {
          activeTools: [TOOL_ID]
        }
      }
    ],

    async onClick() {

      await clearAllShapes();

    }
  });
}



// --------------------------------------------------
// Запуск расширения
// --------------------------------------------------

OBR.onReady(async () => {

  // Сначала создаём mode,
  // потому что он указан как defaultMode инструмента
  await createMode();

  await createTool();

  await createAction();

  await createEraseSelectedAction();

  await createClearAllAction();

    // Слушаем результаты Dice+
  startDicePlusDamageListener();

  console.log(
    "Asset Shape Tool loaded"
  );
});
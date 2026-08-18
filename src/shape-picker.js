import OBR from "@owlbear-rodeo/sdk";


const ID = "com.Knight.asset-shape";

const TOOL_ID = `${ID}/tool`;


// --------------------------------------------------
// Подсветка выбранной фигуры
// --------------------------------------------------

function updateSelected(shapeType) {

  const buttons =
    document.querySelectorAll(
      "[data-shape]"
    );


  for (const button of buttons) {

    const selected =
      button.dataset.shape === shapeType;

    button.classList.toggle(
      "selected",
      selected
    );

    button.setAttribute(
      "aria-pressed",
      String(selected)
    );
  }
}

function updateSizeControls(
  linkSizeInput,
  shapeScaleInput,
  fixedShapeSizeInput
) {
  const linked =
    linkSizeInput.checked;

  shapeScaleInput.disabled =
    !linked;

  fixedShapeSizeInput.disabled =
    linked;
}


// --------------------------------------------------
// Безопасное число
// --------------------------------------------------

function getNumber(value, fallback) {

  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return fallback;
}


// --------------------------------------------------
// Запуск
// --------------------------------------------------

OBR.onReady(async () => {

  const metadata =
    await OBR.tool.getMetadata(
      TOOL_ID
    );


  // ------------------------------------------------
  // Элементы интерфейса
  // ------------------------------------------------

    const colorInput =
    document.querySelector("#color");

    const shapeScaleInput =
    document.querySelector("#shapeScale");

    const linkSizeInput =
    document.querySelector("#linkSizeToAsset");

    const fixedShapeSizeInput =
    document.querySelector("#fixedShapeSize");

    const strokeWidthInput =
    document.querySelector("#strokeWidth");

    const dashLengthInput =
    document.querySelector("#dashLength");

    const dashGapInput =
    document.querySelector("#dashGap");




  // ------------------------------------------------
  // Текущая фигура
  // ------------------------------------------------

  const currentShape =
    typeof metadata.shapeType === "string"
      ? metadata.shapeType
      : "CIRCLE";


  updateSelected(currentShape);


  // ------------------------------------------------
  // Загружаем сохранённые настройки
  // ------------------------------------------------

    colorInput.value =
        typeof metadata.strokeColor === "string"
      ? metadata.strokeColor
      : "#ff3b30";
    
    shapeScaleInput.value =
  getNumber(
    metadata.shapeScale,
    1
  );

    linkSizeInput.checked =
  metadata.linkSizeToAsset !== false;


    fixedShapeSizeInput.value =
    getNumber(
        metadata.fixedShapeSize,
        200
    );

  


  strokeWidthInput.value =
    getNumber(
      metadata.strokeWidth,
      6
    );
    


  dashLengthInput.value =
    getNumber(
      metadata.dashLength,
      24
    );


  dashGapInput.value =
    getNumber(
      metadata.dashGap,
      12
    );
  updateSizeControls(
  linkSizeInput,
  shapeScaleInput,
  fixedShapeSizeInput
);


  // ------------------------------------------------
  // Выбор фигуры
  // ------------------------------------------------

  const buttons =
    document.querySelectorAll(
      "[data-shape]"
    );


  for (const button of buttons) {

    button.addEventListener(
      "click",
      async () => {

        const shapeType =
          button.dataset.shape;


        if (!shapeType) {
          return;
        }


        await OBR.tool.setMetadata(
          TOOL_ID,
          {
            shapeType
          }
        );


        updateSelected(shapeType);
      }
    );
  }


  // ------------------------------------------------
  // Цвет
  // ------------------------------------------------

  colorInput.addEventListener(
    "input",
    async () => {

      await OBR.tool.setMetadata(
        TOOL_ID,
        {
          strokeColor:
            colorInput.value
        }
      );
    }
  );

  shapeScaleInput.addEventListener(
  "change",
  async () => {

    const shapeScale =
      Math.max(
        0.1,
        Number(shapeScaleInput.value)
      );

    shapeScaleInput.value =
      shapeScale;

    await OBR.tool.setMetadata(
      TOOL_ID,
      {
        shapeScale
      }
    );
  }
);

    linkSizeInput.addEventListener(
    "change",
    async () => {

        const linkSizeToAsset =
        linkSizeInput.checked;

        await OBR.tool.setMetadata(
        TOOL_ID,
        {
            linkSizeToAsset
        }
        );

        updateSizeControls(
        linkSizeInput,
        shapeScaleInput,
        fixedShapeSizeInput
      );
    }
    );

    fixedShapeSizeInput.addEventListener(
    "change",
    async () => {

        const fixedShapeSize =
        Math.max(
            10,
            Number(fixedShapeSizeInput.value)
        );

        fixedShapeSizeInput.value =
        fixedShapeSize;

        await OBR.tool.setMetadata(
        TOOL_ID,
        {
            fixedShapeSize
        }
        );
    }
    );


  // ------------------------------------------------
  // Толщина линии
  // ------------------------------------------------

  strokeWidthInput.addEventListener(
    "change",
    async () => {

      const strokeWidth =
        Math.max(
          1,
          Number(strokeWidthInput.value)
        );


      strokeWidthInput.value =
        strokeWidth;


      await OBR.tool.setMetadata(
        TOOL_ID,
        {
          strokeWidth
        }
      );
    }
  );


  // ------------------------------------------------
  // Длина палочки
  // ------------------------------------------------

  dashLengthInput.addEventListener(
    "change",
    async () => {

      const dashLength =
        Math.max(
          1,
          Number(dashLengthInput.value)
        );


      dashLengthInput.value =
        dashLength;


      await OBR.tool.setMetadata(
        TOOL_ID,
        {
          dashLength
        }
      );
    }
  );


  // ------------------------------------------------
  // Промежуток
  // ------------------------------------------------

  dashGapInput.addEventListener(
    "change",
    async () => {

      const dashGap =
        Math.max(
          0,
          Number(dashGapInput.value)
        );


      dashGapInput.value =
        dashGap;


      await OBR.tool.setMetadata(
        TOOL_ID,
        {
          dashGap
        }
      );
    }
  );

});
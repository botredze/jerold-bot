const { createCanvas, loadImage, registerFont } = require("canvas");
const moment = require("moment");

registerFont("public/fonts/Gilroy-Medium.ttf", { family: 'Gilroy' });

const generateImage = (short, direction_top, symbol, openPrice, type, date, stopLoss, profit) => {
  if (short) {
    const canvas = createCanvas(800, 334);
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "left";
    //background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //fields
    ctx.strokeStyle = "#1E1E1F";
    ctx.fillStyle = "#1E1E1F";
    roundRect(ctx, 20, 80, 258, 152, 16, true, false);
    roundRect(ctx, 296, 80, 204, 152, 16, true, false);
    roundRect(ctx, 520, 80, 258, 152, 16, true, false);

    let textFixPos = -7;
    ctx.fillStyle = "#636767";
    //first Line Fields text

    ctx.font = "normal 24px Gilroy";
    ctx.fillText("Symbol", 40, 126 + textFixPos);
    ctx.fillText("Direction", 315, 120 + textFixPos);
    ctx.fillText("Price Open", 550, 120 + textFixPos);

    //second Line Fields text
    ctx.font = "normal 22px Gilroy";
    ctx.fillText("Date (GMT+3)", 32, 38 + textFixPos);

    ctx.fillStyle = "#F6F6F6";
    //second Line Fields text
    ctx.font = "32px Gilroy semibold";
    ctx.fillText(date, 200, 42 + textFixPos);

    textFixPos = -13;
    //first Data Fields text
    ctx.font = "semiBold 48px Gilroy semibold";
    ctx.fillText(symbol, 39, 189 + textFixPos);
    ctx.textAlign = "left";
    ctx.fillText(openPrice, 550, 190 + textFixPos);

    //Direction Block
    if (direction_top) {
      ctx.fillStyle = "#35CA56";
      ctx.fillText("UP", 322, 190 + textFixPos);
      ctx.strokeStyle = "#35CA56";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(394, 158);
      ctx.lineTo(403, 148);
      ctx.lineTo(412, 158);
      ctx.moveTo(403, 148);
      ctx.lineTo(403, 171);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FC424D";
      ctx.fillText("Down", 322, 190 + textFixPos);
      ctx.strokeStyle = "#FC424D";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(464, 162);
      ctx.lineTo(473, 172);
      ctx.lineTo(482, 162);
      ctx.moveTo(473, 172);
      ctx.lineTo(473, 149);
      ctx.stroke();
    }

    return canvas.toBuffer();
  } else {
    const canvas = createCanvas(800, 334);
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "left";
    //background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //fields
    ctx.strokeStyle = "#1E1E1F";
    ctx.fillStyle = "#1E1E1F";
    roundRect(ctx, 32, 186, 154, 116, 16, true, false);
    roundRect(ctx, 194, 186, 229, 116, 16, true, false);
    roundRect(ctx, 431, 186, 160, 116, 16, true, false);
    roundRect(ctx, 599, 186, 169, 116, 16, true, true);

    let textFixPos = -7;
    ctx.fillStyle = "#636767";
    //first Line Fields text

    ctx.font = "normal 24px Gilroy";
    ctx.fillText("Symbol", 32, 61 + textFixPos);
    ctx.fillText("Direction", 359, 61 + textFixPos);
    ctx.fillText("Price Open", 637, 61 + textFixPos);

    //second Line Fields text
    ctx.font = "normal 22px Gilroy";
    ctx.fillText("Type", 64, 236 + textFixPos);
    ctx.fillText("Date (GMT+3)", 226, 236 + textFixPos);
    ctx.fillText("Stop Loss", 463, 236 + textFixPos);
    ctx.fillText("Take Profit", 631, 236 + textFixPos);

    ctx.fillStyle = "#F7F7F7";
    //second Line Fields text
    ctx.font = "22px Gilroy semibold";
    ctx.fillText(type, 64, 278 + textFixPos);
    ctx.fillText(date, 226, 278 + textFixPos);
    ctx.fillText(stopLoss, 463, 278 + textFixPos);
    ctx.fillText(profit, 631, 278 + textFixPos);

    textFixPos = -13;
    //first Data Fields text
    ctx.font = "semiBold 48px Gilroy semibold";
    ctx.fillText(symbol, 32, 154 + textFixPos);
    ctx.textAlign = "right";
    ctx.fillText(openPrice, 768, 154 + textFixPos);

    //Direction Block
    if (direction_top) {
      ctx.fillStyle = "#35CA56";
      ctx.fillText("UP", 488, 154 + textFixPos);
      ctx.strokeStyle = "#35CA56";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(494, 123);
      ctx.lineTo(503, 113);
      ctx.lineTo(512, 123);
      ctx.moveTo(503, 113);
      ctx.lineTo(503, 136);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FC424D";
      ctx.fillText("Down", 488, 154 + textFixPos);
      ctx.strokeStyle = "#FC424D";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(494, 126);
      ctx.lineTo(503, 136);
      ctx.lineTo(512, 126);
      ctx.moveTo(503, 136);
      ctx.lineTo(503, 113);
      ctx.stroke();
    }

    return canvas.toBuffer();
  }
};

const generateImageV2 = (short, direction_top, symbol, openPrice, type, date, stopLoss, profit) => {
    const canvas = createCanvas(800, short ? 286 : 311);
    const ctx = canvas.getContext("2d");
    const rectsMarginTop = short ? 0 : 25;
    ctx.textAlign = "left";
    //background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //fields
    ctx.strokeStyle = "#1E1E1F";
    ctx.fillStyle = "#1E1E1F";

    roundRect(ctx, 20, 102 + rectsMarginTop, 258, 152, 16, true, false);
    roundRect(ctx, 296, 102 + rectsMarginTop, 204, 152, 16, true, false);
    roundRect(ctx, 520, 102 + rectsMarginTop, 258, 152, 16, true, false);

    const dualLineText = (ctx, left, key, value, keyColor) => {
      //First line
      ctx.fillStyle = keyColor;
      ctx.font = "normal 22px Gilroy";
      ctx.fillText(key, left, 24 + textFixPos - rectsMarginTop);
      //Second line
      ctx.fillStyle = "#F6F6F6";
      ctx.font = "28px Gilroy";
      ctx.fillText(value, left, 36 + textFixPos - rectsMarginTop + 32);
    }

    let textFixPos = -7 + 35 + rectsMarginTop;
    ctx.fillStyle = "#636767";
    //first Line Fields text

    ctx.font = "normal 24px Gilroy";
    ctx.fillText("Symbol", 40, 120 + textFixPos);
    ctx.fillText("Direction", 315, 120 + textFixPos);
    ctx.fillText("Price Open", 550, 120 + textFixPos);

    if (short) {
      //second Line Fields text
      ctx.font = "normal 22px Gilroy";
      ctx.fillText(`Date (GMT${date[2]})`, 32, 32 + textFixPos - rectsMarginTop);

      ctx.fillStyle = "#F6F6F6";
      //second Line Fields text
      ctx.font = "28px Gilroy";
      ctx.fillText(date, 200, 36 + textFixPos - rectsMarginTop);
    } else {
      dualLineText(ctx, 32, `Date (GMT${date[2]})`, `${date[0]} ${date[1]}`, "#636767");
      dualLineText(ctx, 400, "Take Profit", profit, "#B1FFDF");
      dualLineText(ctx, 600, "Stop Loss", stopLoss, "#FED3CE");
    }

    textFixPos = -13;
    //first Data Fields text
    ctx.font = "semiBold 42px Gilroy";
    ctx.fillText(symbol, 39, 189 + textFixPos + 42 + rectsMarginTop);
    ctx.textAlign = "left";
    ctx.fillText(openPrice, 550, 190 + textFixPos + 42 + rectsMarginTop);

    //Direction Block
    if (direction_top) {
      ctx.fillStyle = "#35CA56";
      ctx.fillText("Buy", 322, 190 + textFixPos + 40 + rectsMarginTop);
      ctx.strokeStyle = "#35CA56";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;

      //Drawing arrow
      ctx.beginPath();
      ctx.moveTo(394 + 28, 158 + 45 + rectsMarginTop);
      ctx.lineTo(403 + 28, 148 + 45 + rectsMarginTop);
      ctx.lineTo(412 + 28, 158 + 45 + rectsMarginTop);
      ctx.moveTo(403 + 28, 148 + 45 + rectsMarginTop);
      ctx.lineTo(403 + 28, 171 + 45 + rectsMarginTop);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FC424D";
      ctx.fillText("Sell", 322, 225 + textFixPos + rectsMarginTop);
      ctx.strokeStyle = "#FC424D";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;

      //Drawing arrow
      ctx.beginPath();
      ctx.moveTo(464 - 42, 162 + 36 + rectsMarginTop);
      ctx.lineTo(473 - 42, 172 + 36 + rectsMarginTop);
      ctx.lineTo(482 - 42, 162 + 36 + rectsMarginTop);
      ctx.moveTo(473 - 42, 172 + 36 + rectsMarginTop);
      ctx.lineTo(473 - 42, 149 + 36 + rectsMarginTop);
      ctx.stroke();
    }

    return canvas.toBuffer();
};

const roundRect = (ctx, x, y, width, height, radius = 5, fill = false, stroke = true) => {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
};

const generateImageFromJson = (signal) => {
  const date = signal.TM.split(' ');
  return generateImageV2(
    signal.kind === 0,
    signal.vector === "Buy",
    signal.symbol,
    signal.OP,
    null,
    date,
    signal.SL,
    signal.TP
  );
}

const returnShortImage = (string) => {
  const arr = string.split(" ");

  let inputParams = {};
  if (arr.length === 4) {
    const dateArr = arr[2].split("T");
    inputParams = {
      short: true,
      direction_top: arr[1] === "UP",
      symbol: arr[0],
      openPrice: arr[3],
      date: `${dateArr[0]} ${dateArr[1].slice(0, -8)}`,
    };
  } else {
    const dateArr = arr[3].split("T");
    inputParams = {
      short: true,
      direction_top: arr[2] === "UP",
      symbol: `${arr[0]}${arr[1]}`,
      openPrice: arr[4],
      date: `${dateArr[0]} ${dateArr[1].slice(0, -8)}`,
    };
  }

  return generateImage(
    inputParams.short,
    inputParams.direction_top,
    inputParams.symbol,
    inputParams.openPrice,
    inputParams.type,
    inputParams.date
  );
};

module.exports = {
  generateImage,
  roundRect,
  returnShortImage,
  generateImageFromJson
};

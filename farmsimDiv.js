/// Farm simulator implementation without PIXI.js (only with div and style)
var FarmsimDiv = new (function(){
'use strict';
var game;
var container;
var table;
var tileElems;
var scrollPos = [0, 0];
var selectedTile = null;
var selectedCoords = null;
var viewPortWidth;
var viewPortHeight;
var width;
var height;
var cursorElem;

// Constants
var tilesize = 32;

var weedsTextures = [
	"url(assets/weeds1.png)",
	"url(assets/weeds2.png)",
	"url(assets/weeds3.png)",
];

var weedsThresholds = [
	0.25, 0.50, 0.75
];


window.addEventListener('load', function(){
	width = 640;
	height = 480;
	viewPortWidth = 16;
	viewPortHeight = 12;


	init();
});

function elemAt(x, y){
	if(x instanceof Array){
		y = x[1];
		x = x[0];
	}
	return tileElems[x + y * viewPortWidth];
}

function init(){
	game = new FarmGame(width / 32, height / 32);

	generateBoard();

	game.onUpdateCell = function(cell,x,y){
		if(cell.elem === undefined){
			cell.elem = elemAt(x,y);
		}

		if(cell.elem){
			// Remove the children first, because old nodes may be present
//			while(cell.elem.firstChild)
//				cell.elem.removeChild(cell.elem.firstChild);
			for(var weedsIndex = 0; weedsIndex < weedsTextures.length; weedsIndex++){
				if(cell.weeds < weedsThresholds[weedsIndex])
					break;
			}
			if(0 < weedsIndex){
				if(cell.weedsSprite === undefined){
					var weedsSprite = document.createElement('div');
					weedsSprite.style.width = '32px';
					weedsSprite.style.height = '32px';
					weedsSprite.style.backgroundImage = weedsTextures[weedsIndex - 1];
					cell.elem.appendChild(weedsSprite);
					cell.weedsSprite = weedsSprite;
				}
				else
					cell.weedsSprite.style.backgroundImage = weedsTextures[weedsIndex - 1];
			}
			else if(cell.weedsSprite !== undefined){
				cell.graphics.removeChild(cell.weedsSprite);
				cell.weedsSprite = undefined;
			}
		}
	};

	game.init();

	requestAnimationFrame(animate);

	// Variable to remember the last time of animation frame.
	var lastTime = null;

	function animate(timestamp) {
		// Calculate the delta-time of this frame for game update process.
		if(lastTime === null)
			lastTime = timestamp;
		var deltaTime = timestamp - lastTime;
		lastTime = timestamp;

		game.update(deltaTime);

/*		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText(i18n.t("Pos") + ": " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ i18n.t("Weeds") + ": " + Math.floor(100 * statusCell.weeds) + " (" + Math.floor(100 * statusCell.weedRoots) + ")\n"
			+ i18n.t("Plowed") + ": " + (statusCell.plowed ? "Yes" : "No") + "\n"
			+ i18n.t("Humidity") + ": " + Math.floor(statusCell.humidity * 100) + "\n"
			+ i18n.t("Mulch") + ": " + (statusCell.mulch ? "Yes" : "No") + "\n"
			+ i18n.t("Fertility") + ": " + Math.floor(statusCell.fertility * 100) + "\n"
			+ i18n.t("Potato Pest") + ": " + Math.floor(100 * statusCell.potatoPest) + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("growth") + ": " + Math.floor(statusCell.crop.amount * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("quality") + ": " + Math.floor(statusCell.crop.getQuality() * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("value") + ": " + Math.floor(statusCell.crop.eval()) : ""));*/

//		cursorSprite.x = statusCursor.x * 32;
//		cursorSprite.y = statusCursor.y * 32;

/*		gstatusText.setText(i18n.t("Working Power") + ": " + Math.floor(game.workingPower));
		gstatusWPBar.setFactor(game.workingPower / 100);
		gstatusCashText.setText(i18n.t("Cash") + ": $" + Math.floor(game.cash));
		gstatusWeatherText.setText(i18n.t("Weather") + ": (" + Math.floor(game.weather * 100) + ")\n"
			+ weatherIcons[Math.floor(game.weather * weatherIcons.length)].caption);
		for(var i = 0; i < weatherSprites.length; i++)
			weatherSprites[i].visible = i / weatherSprites.length <= game.weather && game.weather < (i+1) / weatherSprites.length;

		renderer.render(stage);
*/
		requestAnimationFrame(animate);
	}
}

function generateBoard(){
	createElements();
}

function createElements(){
	tileElems = new Array(viewPortWidth * viewPortHeight);

	// The containers are nested so that the inner container can be easily
	// discarded to recreate the whole game.
	var outerContainer = document.getElementById("container");
	if(container)
		outerContainer.removeChild(container);
	container = document.createElement("div");
	outerContainer.appendChild(container);
	if(cursorElem)
		cursorElem = null;
//	if(toolCursorElem)
//		toolCursorElem = null;

	table = document.createElement("div");
	table.style.borderStyle = 'solid';
	table.style.borderWidth = '1px';
	table.style.borderColor = 'red';
	table.style.position = 'relative';
//	table.style.left = '50%';
	table.style.width = (viewPortWidth * tilesize) + 'px';
	table.style.height = (viewPortHeight * tilesize) + 'px';

/*	messageElem = document.createElement('div');
	container.appendChild(messageElem);
	messageElem.style.fontFamily = 'Sans-serif';
	messageElem.style.fontSize = '20pt';
	messageElem.style.position = 'relative';
	messageElem.style.color = 'red';*/

	container.appendChild(table);
	for(var iy = 0; iy < viewPortHeight; iy++){
		for(var ix = 0; ix < viewPortWidth; ix++){
			var tileElem = document.createElement("div");
			tileElems[ix + iy * viewPortWidth] = tileElem;
			tileElem.innerHTML = "";
			tileElem.style.width = '32px';
			tileElem.style.height = '32px';
			tileElem.style.position = 'absolute';
			tileElem.style.top = (tilesize * iy) + 'px';
			tileElem.style.left = (tilesize * ix) + 'px';
			tileElem.style.backgroundImage = "url(assets/dirt.png)";
			tileElem.onmousedown = function(e){
			}

			tileElem.onmousemove = function(){
				selectTile(this);
			}

			table.appendChild(tileElem);
		}
	}
}

function selectTile(sel){
	selectedTile = sel;
	var idx = tileElems.indexOf(sel);
	var vx = idx % viewPortWidth;
	var vy = Math.floor(idx / viewPortWidth);
	var ix = vx + scrollPos[0];
	var iy = vy + scrollPos[1];
	selectedCoords = [ix, iy];
	if(ix < width && iy < height){
		if(!cursorElem){
			cursorElem = document.createElement('div');
			cursorElem.style.border = '2px blue solid';
			cursorElem.style.pointerEvents = 'none';
			table.appendChild(cursorElem);
		}
		cursorElem.style.position = 'absolute';
		cursorElem.style.top = (tilesize * vy) + 'px';
		cursorElem.style.left = (tilesize * vx) + 'px';
		cursorElem.style.width = '30px';
		cursorElem.style.height = '30px';
//		updateInfo();
//		updateInventory();
	}
}


})();

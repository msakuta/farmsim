/// Farm simulator implementation without PIXI.js (only with div and style)
var FarmsimDiv = new (function(){
'use strict';

// Obtain the browser's preferred language.
var currentLanguage = (window.navigator.language || window.navigator.userLanguage || window.navigator.userLanguage).substr(0, 2);

i18n.init({lng: currentLanguage, fallbackLng: 'en', resStore: resources, getAsync: false});

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
var infoElem;
var tipElem; // Tooltip window
var pauseOverlay;
var growthBar = false;

var toolBarElem;
var toolElems = [];
var controlBarElem;
var controlElems = [];

var gstatusText;
var gstatusWPBar;
var gstatusCashText;
var gstatusWeatherText;

// Constants
var tilesize = 32;
var statusBarWidth = 200;


var weatherIcons = [
	{caption: i18n.t("Sunny"), texture: "url(assets/sunny.png)"},
	{caption: i18n.t("Partly cloudy"), texture: "url(assets/partlycloudy.png)"},
	{caption: i18n.t("Cloudy"), texture: "url(assets/cloudy.png)"},
	{caption: i18n.t("Rainy"), texture: "url(assets/rainy.png)"}
];
var weatherSprites = [];

var weedsTextures = [
	"url(assets/weeds1.png)",
	"url(assets/weeds2.png)",
	"url(assets/weeds3.png)",
];

var weedsThresholds = [
	0.25, 0.50, 0.75
];

var toolDefs = [
	{img: 'assets/plow.png', caption: i18n.t('Plow'), click: 'plow'},
	{img: 'assets/seed.png', caption: i18n.t('Corn'), click: 'seed'},
	{img: 'assets/potatoSeed.png', caption: i18n.t('Potato'), click: 'seedTuber'},
	{img: 'assets/harvest.png', caption: i18n.t('Harvest'), click: 'harvest'},
	{img: 'assets/water.png', caption: i18n.t('Water'), click: 'water'},
	{img: 'assets/weeding.png', caption: i18n.t('Weed'), click: 'weeding'},
	{img: 'assets/mulch.png', caption: i18n.t('Mulch'), click: 'mulching'},
	{img: 'assets/fertilizer.png', caption: i18n.t('Fertilize'), click: 'fertilize'},
];

var currentTool = -1;


window.addEventListener('load', function(){
	width = 640;
	height = 480;
	viewPortWidth = 16;
	viewPortHeight = 12;


	init();
});

function coordOfElem(elem){
	var idx = tileElems.indexOf(elem);
	if(0 <= idx)
		return [ idx % viewPortWidth - scrollPos[0], Math.floor(idx / viewPortWidth) - scrollPos[1]];
	else
		return null;
}

function elemAt(x, y){
	if(x instanceof Array){
		y = x[1];
		x = x[0];
	}
	if(0 <= x && x < viewPortWidth && 0 <= y && y < viewPortHeight)
		return tileElems[x + y * viewPortWidth];
	else
		return null;
}

function init(){
	game = new FarmGame(width / 32, height / 32);

	game.onAutoSave = function(str){
		document.getElementById('autoSaveText').value = str;
	}

	generateBoard();

	var cornTextures = [
		"url(assets/corn0.png)",
		"url(assets/corn1.png)",
		"url(assets/corn2.png)",
		"url(assets/corn3.png)",
		"url(assets/corn4.png)",
		"url(assets/corn5.png)",
	];
	var cornThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];
	var potatoTextures = [
		"url(assets/potato0.png)",
		"url(assets/potato1.png)",
		"url(assets/potato2.png)",
		"url(assets/potato3.png)",
		"url(assets/potato4.png)",
		"url(assets/potato5.png)",
	];
	var potatoThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];

	game.onUpdateCell = function(cell,x,y){
		if(cell.elem === undefined){
			cell.elem = elemAt(x,y);
		}

		if(cell.elem){
			for(var weedsIndex = 0; weedsIndex < weedsTextures.length; weedsIndex++){
				if(cell.weeds < weedsThresholds[weedsIndex])
					break;
			}
			if(0 < weedsIndex){
				if(cell.weedsSprite === undefined){
					var weedsSprite = document.createElement('div');
					weedsSprite.style.position = 'absolute';
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
				cell.elem.removeChild(cell.weedsSprite);
				cell.weedsSprite = undefined;
			}

			// Mulching sheet sprite
			if(cell.mulch){
				if(cell.mulchSprite === undefined){
					var mulchSprite = document.createElement('div');
					mulchSprite.style.position = 'absolute';
					mulchSprite.style.width = '32px';
					mulchSprite.style.height = '32px';
					mulchSprite.style.backgroundImage = 'url(assets/mulch.png)';
					mulchSprite.style.zIndex = 1;
					cell.elem.appendChild(mulchSprite);
					cell.mulchSprite = mulchSprite;
				}
				else
					cell.mulchSprite.style.display = cell.mulch ? 'block' : 'none';
			}
			else if(cell.mulchSprite !== undefined){
				cell.elem.removeChild(cell.mulchSprite);
				cell.mulchSprite = undefined;
			}

			// Crop layer sprite
			var cornIndex = 0;
			var textures = cornTextures;
			var thresholds = cornThresholds;
			if(cell.crop){
				if(cell.crop.type === "Potato"){
					textures = potatoTextures;
					thresholds = potatoThresholds;
				}
				for(; cornIndex < textures.length; cornIndex++){
					if(cell.crop.amount < thresholds[cornIndex])
						break;
				}
			}

			if(0 < cornIndex){
				if(cell.cornSprite === undefined){
					var cornSprite = document.createElement('div');
					cornSprite.style.position = 'absolute';
					cornSprite.style.width = '32px';
					cornSprite.style.height = '32px';
					cornSprite.style.backgroundImage = textures[cornIndex - 1];

					// We do not want mulch sheet graphics drawn over crops, so we set z-index styles accordingly.
					cornSprite.style.zIndex = 2;
					cell.elem.appendChild(cornSprite);
					cell.cornSprite = cornSprite;
				}
				else
					cell.cornSprite.style.backgroundImage = textures[cornIndex - 1];
			}
			else if(cell.cornSprite !== undefined){
				cell.elem.removeChild(cell.cornSprite);
				cell.cornSprite = undefined;
			}

			// Growth bar
			const barMargin = 2;
			const barWidth = tilesize - barMargin * 2;
			const barHeight = 4;
			if(growthBar && cell.crop){
				var outerBarElem, innerBarElem;
				if(cell.outerBarElem === undefined){
					outerBarElem = document.createElement('div');
					outerBarElem.style.position = 'absolute';
					outerBarElem.style.top = (tilesize - barHeight - barMargin) + 'px';
					outerBarElem.style.left = barMargin + 'px';
					outerBarElem.style.width = barWidth + 'px';
					outerBarElem.style.height = barHeight + 'px';
					outerBarElem.style.zIndex = 10;
					innerBarElem = document.createElement('div');
					innerBarElem.style.position = 'absolute';
					innerBarElem.style.height = '100%';
					outerBarElem.appendChild(innerBarElem);
					cell.elem.appendChild(outerBarElem);
					cell.outerBarElem = outerBarElem;
					cell.innerBarElem = innerBarElem;
				}
				else{
					outerBarElem = cell.outerBarElem;
					innerBarElem = cell.innerBarElem;
				}
				if(cell.crop.amount < 1.){
					outerBarElem.style.backgroundColor = '#ff0000';
					innerBarElem.style.backgroundColor = '#3faf3f'; // The green bar indicates the growth percentage where 100% is merchandizable.
				}
				else if(cell.crop.amount < 2.){
					outerBarElem.style.backgroundColor = '#3faf3f';
					innerBarElem.style.backgroundColor = '#afaf3f'; // Indicate overgrowth of crops by weathered yellow
				}
				else{
					outerBarElem.style.backgroundColor = '#afaf3f';
					innerBarElem.style.backgroundColor = '#afaf3f'; // No point showing the difference in case of growth > 2.
				}
				innerBarElem.style.width = barWidth * (cell.crop.amount % 1.) + 'px';
			}
			else if(cell.outerBarElem !== undefined){
				cell.elem.removeChild(cell.outerBarElem);
				cell.outerBarElem = undefined;
				cell.innerBarElem = undefined;
			}

			cell.elem.style.backgroundImage = cell.plowed ? 'url(assets/ridge.png)' : 'url(assets/dirt.png)';
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

		updateInfo();

		gstatusText.innerHTML = i18n.t("Working Power") + ": " + Math.floor(game.workingPower);
		gstatusWPBar.style.width = (game.workingPower / 100) * statusBarWidth + 'px';
		gstatusCashText.innerHTML = i18n.t("Cash") + ": $" + Math.floor(game.cash);
		gstatusWeatherText.innerHTML = i18n.t("Weather") + ": (" + Math.floor(game.weather * 100) + ")<br>"
			+ weatherIcons[Math.floor(game.weather * weatherIcons.length)].caption;
		for(var i = 0; i < weatherSprites.length; i++)
			weatherSprites[i].style.display = i / weatherSprites.length <= game.weather && game.weather < (i+1) / weatherSprites.length ? 'block' : 'none';

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

	const toolBarMargin = 6;
	const toolButtonBorder = 4;

	const tableWidth = (viewPortWidth * tilesize);
	const toolbarWidth = (128 + toolBarMargin * 2 + toolButtonBorder * 2);
	const totalWidth = tableWidth + toolbarWidth;
	const controlButtonSize = 34; // includes the border which can have button-ish effect
	var controlBarWidth = (controlElems.length + 1) * controlButtonSize + 8;

	table = document.createElement("div");
	table.style.borderStyle = 'solid';
	table.style.borderWidth = '1px';
	table.style.borderColor = 'red';
	table.style.position = 'relative';
	table.style.left = '50%';
	table.style.marginLeft = -(totalWidth) / 2 + 'px';
	table.style.width = tableWidth + 'px';
	table.style.height = (viewPortHeight * tilesize) + 'px';

/*	messageElem = document.createElement('div');
	container.appendChild(messageElem);
	messageElem.style.fontFamily = 'Sans-serif';
	messageElem.style.fontSize = '20pt';
	messageElem.style.position = 'relative';
	messageElem.style.color = 'red';*/

	// Control bar (Horizontal toolbar at the top of the screen)
	controlBarElem = document.createElement('div');
	controlBarElem.style.borderStyle = 'none';
	controlBarElem.style.borderWidth = '1px';
	controlBarElem.style.borderColor = 'red';
	controlBarElem.style.backgroundColor = 'rgb(127,127,127)';
	controlBarElem.style.position = 'relative';
	controlBarElem.margin = '3px';
	controlBarElem.style.left = '50%';
	controlBarElem.style.marginLeft = (-totalWidth + tableWidth - controlBarWidth) / 2 + 'px';
	controlBarElem.style.paddingLeft = '4px';
	controlBarElem.style.width = controlBarWidth + 'px';
	controlBarElem.style.height = (tilesize + 8) + 'px';
	container.appendChild(controlBarElem);
	function addControlButton(i, img, onclick, desc){
		var button = document.createElement('div');
		button.style.width = '31px';
		button.style.height = '31px';
		button.style.position = 'absolute';
		button.style.top = '4px';
		button.style.left = (controlButtonSize * controlElems.length + 4) + 'px';
		button.style.border = '2px #afafaf';
		button.style.borderStyle = 'groove';
		button.style.backgroundImage = img;
		button.onmousedown = onclick;
		button.onmouseover = function(e){
			tipElem.innerHTML = i18n.t(desc);
			tipElem.style.display = 'block';
			tipElem.style.width = '';
			tipElem.style.top = (e.target.getBoundingClientRect().bottom + 4 - e.target.parentElement.getBoundingClientRect().top) + 'px';
			tipElem.style.marginLeft = (-totalWidth / 2 + tableWidth / 2 - tipElem.getBoundingClientRect().width / 2) + 'px';
		};
		button.onmouseleave = function(e){
			tipElem.style.display = 'none';
		}
		controlBarElem.appendChild(button);
		controlBarWidth = (controlElems.length + 1) * controlButtonSize + 8;
		controlBarElem.style.width = controlBarWidth + 'px';
		controlBarElem.style.marginLeft = (-totalWidth + tableWidth - controlBarWidth) / 2 + 'px';
		controlElems.push(button);
	}
	addControlButton(0, 'url("assets/pause.png")', function(e){
		game.pause();
		e.target.style.borderStyle = game.paused ? 'inset' : 'groove';;
	}, "Pause");
	addControlButton(1, 'url("assets/potato4.png")', function(e){
		growthBar = !growthBar;
		e.target.style.borderStyle = growthBar ? 'inset' : 'groove';
	}, "Show Crop Growth");

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
				var idx = tileElems.indexOf(this);
				var xy = coordOfElem(this);
				var cell = game.cells[xy[0]][xy[1]];
				if(cell && 0 <= currentTool && currentTool < toolDefs.length){
					var methodName = toolDefs[currentTool].click;
					if(methodName in game)
						game[methodName](cell);
				}
			}

			tileElem.onmousemove = function(){
				selectTile(this);
			}

			table.appendChild(tileElem);
		}
	}

	pauseOverlay = document.createElement("div");
	pauseOverlay.setAttribute('name', 'pauseOverlay');
	pauseOverlay.setAttribute('class', 'noselect');
	pauseOverlay.style.display = 'none';
	pauseOverlay.style.position = 'absolute';
	pauseOverlay.style.zIndex = 100; // Some very high value, because we don't want crops to be dawn on top of pause overlay.
	pauseOverlay.style.pointerEvents = 'none';
	pauseOverlay.style.left = '0px';
	pauseOverlay.style.top = '0px';
	pauseOverlay.style.width = table.style.width;
	pauseOverlay.style.height = table.style.height;
	pauseOverlay.style.backgroundColor = 'rgba(63,63,63,0.3)';
	for(var i = 0; i < 2; i++){
		pauseOverlay.appendChild((function (left){
			var elem = document.createElement("div");
			elem.style.position = 'absolute';
			elem.style.left = (viewPortWidth * tilesize) * (left / 16) + 'px';
			elem.style.top = (viewPortHeight * tilesize) * (1 / 4) + 'px';
			elem.style.width = (viewPortWidth * tilesize) * (1 / 8) + 'px';
			elem.style.height = (viewPortHeight * tilesize) * (1 / 2) + 'px';
			elem.style.backgroundColor = 'rgba(0,0,0,0.5)';
			return elem;
		})([5,9][i]));
	}
	table.appendChild(pauseOverlay);
	game.onPausedChange = (function(paused){pauseOverlay.style.display = paused ? 'block' : 'none'});

	function selectTool(idx){
		// Selecting the same tool twice means deselecting
		if(currentTool === idx)
			idx = -1;
		for(var i = 0; i < toolElems.length; i++){
			toolElems[i].style.backgroundColor = '#7f7fff';
			toolElems[i].style.border = 'outset 4px #7f7f7f';
		}
		if(0 <= idx && idx < toolElems.length){
			toolElems[idx].style.backgroundColor = '#00ffff';
			toolElems[idx].style.border = 'outset 4px #ff0000';
		}
		currentTool = idx;
	}

	// Reset the state before initializing toolbar elements
	toolElems = [];
	currentTool = -1;
//	currentRotation = 0;

	// Tool bar
	toolBarElem = document.createElement('div');
	toolBarElem.setAttribute('class', 'noselect');
	toolBarElem.style.borderStyle = 'solid';
	toolBarElem.style.borderWidth = '1px';
	toolBarElem.style.borderColor = 'red';
	toolBarElem.style.position = 'absolute';
	//toolBarElem.margin = toolBarMargin + 'px';
	toolBarElem.style.top = '0px';
	toolBarElem.style.left = '50%';
	toolBarElem.style.marginLeft = (-totalWidth / 2 + tableWidth + toolBarMargin) +  'px';
	toolBarElem.style.width = toolbarWidth + 'px';
	toolBarElem.style.height = ((toolDefs.length) * (tilesize + toolBarMargin * 2) + toolButtonBorder * 2) + 'px';
	container.appendChild(toolBarElem);
	for(var i = 0; i < toolDefs.length; i++){
		var toolElem = document.createElement('div');
		toolElem.style.position = 'absolute';
		toolElem.style.width = '128px';
		toolElem.style.height = '32px';
		toolElem.style.left = toolBarMargin + 'px';
		toolElem.style.top = (i * (tilesize + toolBarMargin * 2) + toolBarMargin) + 'px';
		toolElem.style.border = 'outset 4px #7f7f7f';
		toolElem.style.backgroundColor = '#7f7fff';
		toolElem.style.textAlign = 'middle';

		var toolIcon = document.createElement('img');
		toolIcon.style.pointerEvents = 'none';
		toolIcon.src = toolDefs[i].img;
		toolElem.appendChild(toolIcon);
		var toolCaption = document.createElement('span');
		toolCaption.style.pointerEvents = 'none';
		toolCaption.innerHTML = toolDefs[i].caption;
		toolCaption.setAttribute('class', 'noselect');
		toolElem.appendChild(toolCaption);

		toolElem.onclick = function(e){
			selectTool(toolElems.indexOf(this));
		};

		toolElem.onmouseover = function(e){
			var i = toolElems.indexOf(e.target);
			if(0 <= i && i < toolDefs.length){
				var methodName = toolDefs[i].click;
				if(methodName in game){
					tipElem.innerHTML = game[methodName].description();
					tipElem.style.display = 'block';
					tipElem.style.width = '';
					tipElem.style.top = (e.target.getBoundingClientRect().top - e.target.parentElement.getBoundingClientRect().top) + 'px';
					tipElem.style.marginLeft = (totalWidth / 2 - toolbarWidth - tipElem.getBoundingClientRect().width) + 'px';
					return;
				}
			}
			tipElem.style.display = 'none';
		};

		toolElem.onmouseleave = function(e){
			tipElem.style.display = 'none';
		}

		toolBarElem.appendChild(toolElem);
		toolElems.push(toolElem);
	}

	var bottomPanel = document.createElement('div');
	bottomPanel.style.margin = '4px';
	bottomPanel.style.position = 'relative';
	bottomPanel.style.height = '13em';
	container.appendChild(bottomPanel);

	infoElem = document.createElement('div');
	infoElem.style.backgroundColor = '#ffff7f';
	infoElem.style.border = '1px solid #00f';
	infoElem.style.padding = '2px';
	infoElem.style.position = 'absolute';
	infoElem.style.left = '50%';
	infoElem.style.marginLeft = (-totalWidth / 2) + 'px';
	infoElem.style.top = '0px';
	infoElem.style.width = '256px';
	infoElem.style.height = '12em';
	infoElem.style.lineHeight = '120%';
	bottomPanel.appendChild(infoElem);

	// The global status panel shows information about the player and other global things.
	var gstatusPanel = document.createElement('div');
	gstatusPanel.style.backgroundColor = '#ffffaf';
	gstatusPanel.style.border = '1px solid #00f';
	gstatusPanel.style.padding = '2px';
	gstatusPanel.style.position = 'absolute';
	gstatusPanel.style.left = '50%';
	gstatusPanel.style.marginLeft = (-totalWidth / 2 + 268) + 'px';
	gstatusPanel.style.top = '0px';
	gstatusPanel.style.width = '120px';
	gstatusPanel.style.height = '75px';
	gstatusPanel.style.lineHeight = '120%';
	gstatusText = document.createElement('div');
	gstatusText.style.fontFamily = 'Sans-serif';
	gstatusText.style.left = '5px';
	gstatusText.style.top = '5px';
	gstatusPanel.appendChild(gstatusText);
	var gstatusWPBarContainer = document.createElement('div');
	gstatusPanel.appendChild(gstatusWPBarContainer);
	gstatusWPBarContainer.style.backgroundColor = '#000';
	gstatusWPBarContainer.style.border = '1px #7f7f7f solid';
	gstatusWPBarContainer.style.width = statusBarWidth + 'px';
	gstatusWPBarContainer.style.height = '8px';
	gstatusWPBar = document.createElement('div');
	gstatusWPBarContainer.appendChild(gstatusWPBar);
	gstatusWPBar.style.backgroundColor = '#f0f';
	gstatusWPBar.style.width = statusBarWidth + 'px';
	gstatusWPBar.style.height = '8px';
	gstatusWPBarContainer.appendChild(gstatusWPBar);
	gstatusCashText = document.createElement('div');
	gstatusCashText.style.fontFamily = 'Sans-serif';
	gstatusCashText.style.left = '5px';
	gstatusCashText.style.top = '30px';
	gstatusPanel.appendChild(gstatusCashText);
	gstatusWeatherText = document.createElement('div');
	gstatusWeatherText.style.fontFamily = 'Sans-serif';
	gstatusWeatherText.style.left = '5px';
	gstatusWeatherText.style.top = '45px';
	gstatusPanel.appendChild(gstatusWeatherText);
	for(var i = 0; i < weatherIcons.length; i++){
		var sprite = document.createElement('div');
		sprite.style.backgroundImage = weatherIcons[i].texture;
		sprite.style.left = '80px';
		sprite.style.top = '40px';
		sprite.style.width = '32px';
		sprite.style.height = '32px';
		weatherSprites.push(sprite);
		gstatusPanel.appendChild(sprite);
	}
	gstatusPanel.style.width = '256px';
	gstatusPanel.style.height = '12em';
	bottomPanel.appendChild(gstatusPanel);

	// Tool tip window
	tipElem = document.createElement('div');
	tipElem.style.display = 'none';
	tipElem.style.position = 'absolute';
	tipElem.style.pointerEvents = 'none';
	tipElem.style.left = '50%';
	tipElem.style.top = '0px';
	tipElem.style.width = '250px';
	tipElem.style.marginLeft = (totalWidth / 2 - toolbarWidth - 250) + 'px';
	tipElem.style.textAlign = 'left';
	tipElem.style.border = 'solid 1px #0000ff';
	tipElem.style.backgroundColor = 'rgba(215,215,191,0.75)';
	tipElem.style.boxShadow = '4px 4px 6px rgba(0,0,0,0.75)';
	tipElem.style.borderRadius = '4px';
	tipElem.style.padding = '4px';	
	tipElem.style.fontSize = '85%';
	tipElem.style.whiteSpace = 'pre';
	tipElem.style.zIndex = 200; // Should be on top of everything else
	container.appendChild(tipElem);
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
		updateInfo();
//		updateInventory();
	}

}

function updateInfo(){
	if(!selectedCoords){
		infoElem.innerHTML = 'Empty tile';
		return;
	}
	if(viewPortWidth <= selectedCoords[0] && viewPortHeight <= selectedCoords[1])
		return;
	var cell = game.cells[selectedCoords[0]][selectedCoords[1]];
	if(!cell){
		infoElem.innerHTML = 'Empty cell<br>';
		return;
	}

	var crop = '';
	if(cell.crop){
		crop =
			(cell.crop.type) + " " + ("growth") + ": " + Math.floor(cell.crop.amount * 100) + "<br>" +
			(cell.crop.type) + " " + ("quality") + ": " + Math.floor(cell.crop.getQuality() * 100) + "<br>" +
			(cell.crop.type) + " " + ("value") + ": " + Math.floor(cell.crop.eval());
	}

	infoElem.innerHTML = i18n.t("Pos") + ": " + selectedCoords[0] + ", " + selectedCoords[1] + "<br>" +
		i18n.t("Weeds") + ": " + Math.floor(100 * cell.weeds) + " (" + Math.floor(100 * cell.weedRoots) + ")<br>" +
		i18n.t("Plowed") + ": " + (cell.plowed ? "Yes" : "No") + "<br>" +
		i18n.t("Humidity") + ": " + Math.floor(cell.humidity * 100) + "<br>" +
		i18n.t("Mulch") + ": " + (cell.mulch ? "Yes" : "No") + "<br>" +
		i18n.t("Fertility") + ": " + Math.floor(cell.fertility * 100) + "<br>" +
		i18n.t("Potato Pest") + ": " + Math.floor(100 * cell.potatoPest) + "<br>" +
		crop;
}


})();

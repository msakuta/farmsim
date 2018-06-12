
function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.workingPower = 100;
	this.cash = 100;
	this.weather = 0;
	this.time = 0;
	this.frameCount = 0;
	this.autosave_frame = 0;
	this.paused = false;
	this.onPausedChange = null;
}

/// The default days per frame constant. It's based on the experience of average crop growth rate.
FarmGame.prototype.daysPerFrame = 0.02;

/// An object representing state of a tile in the garden.
FarmGame.Cell = function(game, weeds, x, y){
	this.game = game; // We should keep a pointer to the game world, although it costs a pointer in memory.
	this.weeds = weeds;
	this.x = x; // Redundant information for optimization
	this.y = y; // Redundant information for optimization
	this.weedRoots = 0.5;
	this.plowed = false;
	this.crop = null;
	this.humidity = 0.5;
	this.mulch = 0;
	this.potatoPest = 0;
	this.fertility = 0.5;
}
FarmGame.Cell.prototype.serialize = function(){
	var v = this;
	return {
		weeds: this.weeds,
		weedRoots: this.weedRoots,
		plowed: this.plowed,
		crop: this.crop ? this.crop.serialize() : null,
		humidity: this.humidity,
		mulch: this.mulch,
		potatoPest: this.potatoPest,
		fertility: this.fertility,
	};
}
FarmGame.Cell.prototype.deserialize = function(data){
	this.weeds = data.weeds;
	this.weedRoots = data.weedRoots;
	this.plowed = data.plowed;
	// Try to find the class name in FarmGame object.
	if(data.crop && data.crop.type in FarmGame){
		// If found, try to instantiate an instance of it.
		this.crop = new FarmGame[data.crop.type];
		if(this.crop)
			this.crop.deserialize(data.crop);
	}
	this.humidity = data.humidity;
	this.mulch = data.mulch;
	this.potatoPest = data.potatoPest;
	this.fertility = data.fertility;
}
FarmGame.Cell.prototype.plow = function(){
	var ret = !this.plowed || this.weeds != 0;
	this.weeds = 0;
	this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
	this.plowed = true;
	this.humidity /= 2; // Plowing soil releases humidity inside it.
	this.potatoPest *= 0.5;
	return ret;
}
FarmGame.Cell.prototype.seed = function(){
	if(this.plowed && !this.crop){
		this.crop = new FarmGame.Corn(this.game.frameCount);
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.seedTuber = function(){
	if(this.plowed && !this.crop){
		this.crop = new FarmGame.Potato(this.game.frameCount);
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.harvest = function(){
	if(this.crop && 1 < this.crop.amount){
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.water = function(){
	// Watering soil makes humidity to approach 1 but never reach it.
	this.humidity += (1. - this.humidity) * 0.5;
	return true;
}
FarmGame.Cell.prototype.weeding = function(){
	if(this.weeds == 0)
		return false;
	this.weeds = 0;
	this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
	this.humidity *= 0.75; // Humidity is rather kept compared to plowing.
	this.potatoPest *= 0.75;
	return true;
}
FarmGame.Cell.prototype.mulching = function(){
	if(0 < this.mulch)
		return false;
	this.mulch++;
	return true;
}
FarmGame.Cell.prototype.fertilize = function(){
	// Fertilizing soil makes fertility to approach 1 but never reach it.
	this.fertility += (1. - this.fertility) * 0.75;
	return true;
}

FarmGame.Crop = function(frameCount){
	this.type = "";
	this.amount = 0;
	this.plantDate = frameCount;
}

FarmGame.Crop.prototype.serialize = function(){
	return this; // Shorthand for serializing all the member variables.
}

FarmGame.Crop.prototype.deserialize = function(data){
	this.amount = data.amount;
	this.plantDate = data.plantDate;
}

FarmGame.Crop.prototype.grow = function(cell,growth){
	this.amount += growth;
}

FarmGame.Crop.prototype.eval = function(){
	// Overgrown crops do not produce money but consumes working power to clean.
	if(1.0 <= this.amount && this.amount < 2.0)
		return 10;
	else
		return 0;
}

FarmGame.Crop.prototype.getQuality = function(){
	return 1;
}


FarmGame.Corn = function(){
	FarmGame.Crop.apply(this, arguments);
	this.type = "Corn";
	this.amount = 0;
	this.quality = 1;
}
FarmGame.Corn.prototype = new FarmGame.Crop;

FarmGame.Corn.prototype.deserialize = function(data){
	FarmGame.Crop.prototype.deserialize.apply(this,arguments);
	this.quality = data.quality;
}

FarmGame.Corn.prototype.grow = function(cell,growth){
	this.amount += growth;
	this.potatoPest = Math.max(0, this.potatoPest - growth); // Corn cleans soil to decrease potato pest.
	// Too much humidity induce degradation of crops
	this.quality *= 1. - cell.humidity * 0.0005;
	cell.fertility = Math.max(0, cell.fertility - growth); // Corn absorbs nutrition of soil to grow
}

FarmGame.Corn.prototype.getQuality = function(){
	return this.quality;
}

FarmGame.Corn.prototype.eval = function(){
	// Potatos yields a bit higher value than corn.
	if(1.0 <= this.amount && this.amount < 2.0)
		return 10 * Math.min(1, this.quality / 0.75); // Degraded corns sell with a lower price
	else
		return 0;
}

FarmGame.Potato = function(){
	FarmGame.Crop.apply(this, arguments);
	this.type = "Potato";
	this.amount = 0;
	this.quality = 1;
}
FarmGame.Potato.prototype = new FarmGame.Crop;

FarmGame.Potato.prototype.deserialize = function(data){
	FarmGame.Crop.prototype.deserialize.apply(this,arguments);
	this.quality = data.quality;
}

FarmGame.Potato.prototype.grow = function(cell,growth){
	this.amount += growth;
	this.quality *= 1. - cell.potatoPest * 0.0003;
	// Too much humidity induce degradation of crops
	this.quality *= 1. - cell.humidity * 0.0003;
	cell.potatoPest = Math.min(1, cell.potatoPest + this.amount * 0.0002);
	cell.fertility = Math.max(0, cell.fertility - growth * 0.75); // Potato consumes relatively little nutrition
}

FarmGame.Potato.prototype.eval = function(){
	// Potatos yields a bit higher value than corn.
	if(1.0 <= this.amount && this.amount < 2.0)
		return 20 * Math.min(1, this.quality / 0.75); // Degraded potatoes sell with a lower price
	else
		return 0;
}

FarmGame.Potato.prototype.getQuality = function(){
	return this.quality;
}


FarmGame.prototype.init = function(){
	if(typeof(Storage) !== "undefined"){
		this.deserialize(localStorage.getItem("FarmGameSave"));
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new FarmGame.Cell(this, weeds, x, y);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.onUpdateCell = function(cell,x,y){}

FarmGame.prototype.update = function(deltaTime){
	if(this.paused){
		return;
	}
	var frameTime = 100; // Frame time interval in milliseconds
	this.time += deltaTime;

	// Repeat the frame procedure in constant interval.
	while(frameTime < this.time){

		this.updateInternal();

		this.time -= frameTime;
	}
}

/// Simple random number generator.
function RandomSequence(seed){
	this.z = (seed & 0xffffffff) + 0x7fffffff;
	this.w = (((this.z ^ 123459876) * 123459871) & 0xffffffff) + 0x7fffffff;
}

RandomSequence.prototype.nexti = function(){
	return ((((this.z=36969*(this.z&65535)+(this.z>>16))<<16)+(this.w=18000*(this.w&65535)+(this.w>>16))) & 0xffffffff) + 0x7fffffff;
}

RandomSequence.prototype.next = function(){
	return this.nexti() / 0xffffffff;
}

/// Noise with a low frequency which is realized by interpolating polygon chart.
function smoothNoise(i){
	var seed = 123;
	var period = 600; // one minute
	var sum = 0.;
	for(var j = 0; j <= 1; j++){
		var rng = new RandomSequence(Math.floor(i / period) + j);
		var value = rng.next(rng);
		// Uniformly distributed random variable is squared to make rainy weather have lower probability.
		sum += value * value * (j ? i % period : period - i % period) / period;
	}
	return sum;
}

FarmGame.prototype.updateInternal = function(){

	// Humidity coefficient of growth for crops and weeds
	function humidityGrowth(cell){
		var h = (0.5 - cell.humidity) / 0.5;
		return ((1. - h * h) + 0.25) / 1.25;
	}

	// Weather based grow speed modifier.
	// Crops grow better when it's sunny, but don't forget to supply sufficient water.
	function sunlightGrowth(game,cell){
		return (1. - game.weather + 0.25) / 1.25;
	}

	// The growth of the grass depends on adjacent cells' grass density.
	function getGrowth(cell,x,y,getter){
		var ret = 0;
		if(0 <= x - 1) ret += getter(this.cells[x - 1][y]);
		if(x + 1 < this.xs) ret += getter(this.cells[x + 1][y]);
		if(0 <= y - 1) ret += getter(this.cells[x][y - 1]);
		if(y + 1 < this.ys) ret += getter(this.cells[x][y + 1]);
		return ret * humidityGrowth(cell) * sunlightGrowth(this,cell);
	}

	this.weather = smoothNoise(this.frameCount);

	for(var x = 0; x < this.cells.length; x++){
		for(var y = 0; y < this.cells[x].length; y++){
			var cell = this.cells[x][y];

			// Obtain growth of weeds
			var growth = (0.0001
				+ getGrowth.call(this, cell, x, y, function(cell){return cell.weeds;}))
					* cell.fertility
					* 0.0001 * cell.weedRoots / (1. + cell.mulch * 2.); // Mulching reduces weed growth.

			if(cell.weeds < 1. - growth)
				cell.weeds += growth;
			else
				cell.weeds = 1.;

			// The roots grow very slowly compared to stems and leaves
			var rootsGrowth = (cell.weedRoots
				+ getGrowth.call(this, cell, x, y, function(cell){return (cell.weeds + cell.weedRoots) * 0.1;}))
					* 0.00001;

			if(cell.weedRoots < 1. - rootsGrowth)
				cell.weedRoots += rootsGrowth;
			else
				cell.weedRoots = 1.;

			// Increase crop growth.  Lower growth if there are weeds.
			// If the corn grow enough, it will degrade no matter how weeds are grown, but it
			// still depends on humidity (wet crops rot faster).
			if(cell.crop)
				cell.crop.grow(cell, cell.fertility * 0.001 * (cell.crop.amount < 1 ? 1. - cell.weeds : 1.)
					* humidityGrowth(cell) * sunlightGrowth(this,cell)); // Humid soil grows crop better

			// Humidity of soil gradually disperse into the air.  Soil humidity gradually approaches air moisture.
			// Mulching reduces evaporation of humidity.
			cell.humidity += (0.75 < this.weather && cell.humidity < this.weather ? 10. * (1. - cell.humidity) : this.weather - cell.humidity) // Rain lifts up humidity rapidly.
				* (0 < cell.mulch ? 0.0002 : 0.0010);

			// Potato pest gradually decreases if there is no potato crop.
			cell.potatoPest *= 0.9999;

			// Fertility increases slightly over time
			cell.fertility = Math.min(1, cell.fertility + 0.00005);

			this.onUpdateCell(cell,x,y);
		}
	}

	if(this.workingPower + 0.1 < 100)
		this.workingPower += 0.1;
	else
		this.workingPower = 100;

	this.frameCount++;

	if(this.autosave_frame + 100 < this.frameCount){

		// Check for localStorage
		if(typeof(Storage) !== "undefined"){
			var serialData = this.serialize();
			localStorage.setItem("FarmGameSave", serialData);
			this.onAutoSave(serialData);
		}

		this.autosave_frame += 100;
	}
}

FarmGame.prototype.serialize = function(){
	var saveData = {workingPower: this.workingPower, cash: this.cash,
		frameCount: this.frameCount, xs: this.xs, ys: this.ys};
	var cells = [];
	for(var x = 0; x < this.cells.length; x++){
		var row = [];
		for(var y = 0; y < this.cells[x].length; y++){
			var v = this.cells[x][y];
			row.push(v.serialize());
		}
		cells.push(row);
	}
	saveData.cells = cells;
	return JSON.stringify(saveData);
}

FarmGame.prototype.deserialize = function(stream){
	var data = JSON.parse(stream);
	if(data != null){
		this.workingPower = data.workingPower;
		this.cash = data.cash;
		this.autosave_frame = this.frameCount = data.frameCount;
		this.xs = data.xs;
		this.ys = data.ys;
		this.cells = [];
		var cells = data.cells;
		for(var x = 0; x < cells.length; x++){
			var row = [];
			for(var y = 0; y < cells[x].length; y++){
				var c = cells[x][y];
				if(!c)
					continue;
				var cell = new FarmGame.Cell(this, c.weeds, x, y);
				cell.deserialize(c);
				row.push(cell);
				this.onUpdateCell(cell,x,y);
			}
			this.cells.push(row);
		}
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new FarmGame.Cell(this, weeds, x, y);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.select = function(cell){return true;}
FarmGame.prototype.select.description = function(){return i18n.t("Selects a cell to inspect");}

FarmGame.prototype.plow = function(cell){
	var workCost = 20; // Plowing is a hard physical job.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.plow()){
		this.workingPower -= workCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.plow.description = function(){
	return i18n.t("Plow and make ridges") + "\n"
		+ i18n.t("Working Power Cost") + ": 20";
}

FarmGame.prototype.seed = function(cell){
	var workCost = 10; // Seeding is not a hard physical task.
	var moneyCost = 1;
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false; // Give up due to low working power
	if(cell.seed()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.seed.description = function(){
	return i18n.t("Apply crop seeds") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $1";
}

FarmGame.prototype.seedTuber = function(cell){
	var workCost = 10; // Seeding is not a hard physical task.
	var moneyCost = 2;
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false; // Give up due to low working power
	if(cell.seedTuber()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.seedTuber.description = function(){
	return i18n.t("Plant seed tubers of potatos") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $2";
}

FarmGame.prototype.harvest = function(cell){
	var workCost = 15; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.harvest()){
		this.workingPower -= workCost;
		this.cash += cell.crop.eval();
		cell.crop = null;
		cell.mulch = 0; // Harvesting discards mulch sheets
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.harvest.description = function(){
	return i18n.t("Harvest and sell crops\nto gain money")
		+ "\n" + i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.water = function(cell){
	var workCost = 5; // Watering is an easy task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.water()){
		this.workingPower -= workCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.water.description = function(){
	return i18n.t("Water soil") + "\n"
		+ i18n.t("Working Power Cost") + ": 5";
}

FarmGame.prototype.weeding = function(cell){
	var workCost = 15; // Weeding is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.weeding()){
		this.workingPower -= workCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.weeding.description = function(){
	return i18n.t("Weed out without plowing\n"
		+ "Soil humidity is rather kept") + "\n"
		+ i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.mulching = function(cell){
	var workCost = 10; // Mulching is a bit of physical work.
	var moneyCost = 2; // and it costs money.
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false;
	if(cell.mulching()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.mulching.description = function(){
	return i18n.t("Mulch soil with plastic blanket\n"
		+ "Keeps soil humidity") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $2";
}

FarmGame.prototype.fertilize = function(cell){
	var workCost = 5; // Fertilizing is just sprinkling manure all over which require little physical work.
	var moneyCost = 2; // but it costs money.
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false;
	if(cell.fertilize()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		this.onUpdateCell(cell, cell.x, cell.y);
		return true;
	}
	else
		return false;
}
FarmGame.prototype.fertilize.description = function(){
	return i18n.t("Add organic fertilizer to soil\n"
		+ "Helps crops grow") + "\n"
		+ i18n.t("Working Power Cost") + ": 5\n"
		+ i18n.t("Money Cost") + ": $2";
}

FarmGame.prototype.pause = function(){
	this.paused = !this.paused;
	if(this.onPausedChange)
		this.onPausedChange(this.paused);
}

FarmGame.prototype.onAutoSave = function(str){
}

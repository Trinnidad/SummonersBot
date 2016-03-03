var Discord = require("discord.js"),
	settings = require('local_settings.js'),
	mysql = require('mysql'),
	async = require('async');

function SWBot(){
	this.bot = new Discord.Client();
	this.connection = mysql.createConnection({
		host : settings.dbHost,
		user : settings.dbUser,
		password : settings.dbPw,
		database : settings.dbName
	});
	this.connection.connect(function(err) {
		if (err) {
			console.log(err);
		}
	});

	this.handleMsg = function (channel, msg){
		var me = this;
		var sql = this.connection.query('SELECT response FROM commands WHERE name =\"' + msg + '\"',
			function(err, result){
				if (err){
					console.log(err);
				} else if (result.length > 0) {
					me.bot.sendMessage(channel, result[0].response).catch(err);
				}
			}
		);
	};
	this.addCommand = function(channel, command, response){
		console.log(command);
		console.log(response);
		if (!command || !response) {
			this.bot.sendMessage(channel, "Error in add command syntax, please try again");
		}
		var me = this;
		var sql = this.connection.query('SELECT name,response FROM commands WHERE name =\"' + command + '\"',
			function(err, result){
				if (err){
					console.log(err);
				} else {
					if (result.length){
						me.bot.sendMessage(channel, "Error: Command !" + command + " already exists!");
					}
					else{
						var sql = me.connection.query('INSERT INTO commands VALUES (\"' + command + '\",\"' + response + '\")',
							function(err, result){
								if (err){
										console.log(err);
								} else {
										console.log(result);
										me.bot.sendMessage(channel, "Created command !"+command + ': ' + response).catch(err);
								}
							}
						);
					}
				}
			}
		);
		
	};
	this.gamble = function(channel, author, amount){
		var me = this;
		var sql = this.connection.query('SELECT hellos, time FROM hellos WHERE name =\"' + author + '\"',
			function(err, result){
				if (err){
					console.log(err);
				} else {
					time = new Date().getTime() / 1000 ;
					if (result.length){
						console.log(result);
						currentAmount = parseInt(result[0].hellos,10);
						if (time - result[0].time >= 30){
							if (amount <= currentAmount) {
								roll = Math.floor(Math.random()*100);
								newAmount = 0;
								if (roll < 60){
									newAmount = currentAmount - amount;
									me.bot.sendMessage(channel, author + " rolled a " + roll + " and lost " + amount + " hellos. You have " + newAmount + " hellos remaining." );
								}
								else if (roll >=60 && roll < 99){
									newAmount = currentAmount + amount;
									me.bot.sendMessage(channel, author + " rolled a " + roll + " and won " + 2*amount + " hellos. You now have " + newAmount + " hellos!");
								}
								else if (roll >= 99) {
									newAmount = currentAmount + 2*amount;
									me.bot.sendMessage(channel, author + " rolled a " + roll + " and won " + 3*amount + " hellos. You now have " + newAmount + " hellos! WHAT A HACKER!");
								}
								sql = me.connection.query('UPDATE hellos SET `hellos`=' + newAmount+ ', `time`=' +time+' WHERE `name`="' + author+ '";',
									function(err, result){
										if (err){
											console.log("Failed to update");
											console.log(err);
										}
									}
								);
							}
						} else{
							console.log("Please wait " + (30-time-result[0].time) + " more seconds before gambling again");
						}
					} else{
						me.createHellosEntry(channel, author, time);
					}
				}
			}
		);
	};
	this.giveHellos = function(me, channel, recipient, amount) {
		time = new Date().getTime() / 1000 ;
		if (recipient == 'all') {
			sql = me.connection.query('UPDATE hellos SET hellos = hellos + ' + amount+';',
				function(err, result){
					if (err){
						console.log("Failed to give periodic hellos");
						console.log(err);
					}
				}
			);
		} else {
			sql = me.connection.query('UPDATE hellos SET hellos = hellos + ' + amount+' WHERE name = "' + recipient +'";',
				function(err, result){
					if (err){
						console.log("Failed to give periodic hellos");
						console.log(err);
					} else {
						me.bot.sendMessage(channel, "Gave " + amount + " hellos to "+ recipient + ". Like hello?");
					}
				}
			);
		}
	};
	this.createHellosEntry = function(channel, author, time){
		this.bot.sendMessage(channel, author + " has no hellos. Um hello?");
		sql = this.connection.query('INSERT INTO hellos (`name`, `time`) VALUES ("'+author+'", '+time+');',
			function(err, result){
				if (err){
					console.log("Failed to insert");
					console.log(err);
				}
			}
		);
	};
	this.hellos = function(channel, author){
		var me = this;
		var sql = this.connection.query('SELECT hellos, time FROM hellos WHERE name =\"' + author + '\"',
			function(err, result){
				if (err) {
					console.log(err);
				} else {
					if (result.length){
						console.log(result);
						me.bot.sendMessage(channel, author + ", You have " + result[0].hellos + " hellos!");
					} else{
						me.createHellosEntry(channel, author, new Date().getTime() / 1000 );
					}
				}
			}
		);
	};
	this.showLeaderboard = function(channel){
		var me = this;
		var sql = this.connection.query('SELECT * FROM hellos order by hellos DESC',
			function(err, result){
				if (err) {
					console.log(err);
				} else {
					if (result.length){
						var messages = [];
						messages.push(function(cb){me.bot.sendMessage(channel, "      HELLOS LEADERBOARD", function(){cb();});});
						messages.push(function(cb){me.bot.sendMessage(channel, "------------------------------------", function(){cb();});});
						console.log(result);
						result.forEach(function(element, index, array){
								messages.push(function(cb){me.bot.sendMessage(channel, element.name + ": " + element.hellos, function(){cb();});});
						});
						async.series(messages,
							function(err){
								if (err) {
									console.log(err);
								}
							});

					}
				}
			});
	};
}

SWBot.prototype.login = function () {
	this.bot.login(settings.discordLogin, settings.discordPw).then(success).catch(err);
};

SWBot.prototype.listen = function () {
	var me = this;
	setInterval(this.giveHellos, 60000, me, null, 'all', 1);
	this.bot.on("message", function (msg) {
		if (msg.author.name != this.user.name){
			console.log("received message: " + msg.cleanContent + " from " + msg.author.name);
			command = msg.cleanContent.split(" ");
			switch(command[0]){
				case '!addcom':
					if (settings.discordMods.indexOf(msg.author.name) != -1) {
						me.addCommand(msg.channel, command[1].substring(1), command.slice(2).join(' '));
					}
					break;
				case '!gamble':
					me.gamble(msg.channel, msg.author.name, parseInt(command[1],10));
					break;
				case '!hellos':
					me.hellos(msg.channel, msg.author.name);
					break;
				case '!give':
					if (settings.discordMods.indexOf(msg.author.name) != -1) {
						me.giveHellos(me, msg.channel, command[1], parseInt(command[2],10));
						if (command[1] == 'all'){
							me.bot.sendMessage(msg.channel, "Gave " + command[2] + " hellos to everyone. Like hello?");
						}
					}
					break;
				case '!leaderboard':
					me.showLeaderboard(msg.channel);
					break;
				default:
					if(command[0][0] == '!') {
						me.handleMsg(msg.channel, command[0].substring(1));
					}
			}
		}
	});
};

function success(token){
	console.log("connected");
}

function err(error){
	console.log(error);
}



module.exports = SWBot;

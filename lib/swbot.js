var Discord = require("discord.js"),
	settings = require('local_settings.js'),
	mysql = require('mysql');

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
			console.log(err)
		}
	});

	this.handleMsg = function (channel, msg){
		var me = this;
		var sql = this.connection.query('SELECT name,response FROM commands WHERE name =\"' + msg + '\"', 
			function(err, result){
				if (err){
					console.log(err)
				} else {
					me.bot.sendMessage(channel, result[0].response).catch(err);
				}
			}
		);
	};
	this.addCommand = function(channel, command, response){
		console.log(command)
		console.log(response)
		if (!command || !response) {
			this.bot.sendMessage(channel, "Error in add command syntax, please try again")
		}
		var me = this;
		var sql = this.connection.query('SELECT name,response FROM commands WHERE name =\"' + command + '\"', 
			function(err, result){
				if (err){
					console.log(err)
				} else {
					if (result.length){
						me.bot.sendMessage(channel, "Error: Command !" + command + " already exists!")
					}
					else{
						var sql = me.connection.query('INSERT INTO commands VALUES (\"' + command + '\",\"' + response + '\")',
							function(err, result){
								if (err){
										console.log(err)
								} else {
										console.log(result)
										me.bot.sendMessage(channel, "Created command !"+command + ': ' + response).catch(err);
								}
							}
						);
					}
				}
			}
		);
		
	};
};

SWBot.prototype.login = function () {
	this.bot.login(settings.discordLogin, settings.discordPw).then(success).catch(err);
};

SWBot.prototype.listen = function () {
	var me = this;
	this.bot.on("message", function (msg) {
		console.log("received message: " + msg.cleanContent)
		command = msg.cleanContent.split(" ");
		console.log(command)
		if (command[0] == '!addcom') {
			me.addCommand(msg.channel, command[1].substring(1), command.slice(2).join(' '));
		}
		else if(command[0][0] == '!') {
			me.handleMsg(msg.channel, command[0].substring(1));
		}
	});
};

function success(token){
	console.log("connected")
}

function err(error){
	console.log(error)
}



module.exports = SWBot

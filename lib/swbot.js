var Discord = require("discord.js"),
    settings = require('local_settings.js'),
    mysql = require('mysql'),
    async = require('async');

var me;

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
    this.leaderboardCD = 0 ;
    this.mods = [];
    me = this;

    this.getMods = function() {
        var me = this;
        var sql = this.connection.query('SELECT ID FROM mods',
            function(err, result) {
                if(err) {
                    console.log('Failed to load mods');
                    console.log(err);
                } else {
                    result.forEach(function(element, index, array){
                        me.mods.push(element.ID);
                    });
                    console.log(me.mods);
                }
            });
    };
    this.getMods();
    this.addMod = function(channel, id, author){
        var me = this;
        var sql = this.connection.query('INSERT INTO mods (`ID`) VALUES ("'+id+'");',
            function(err, result){
                if(err) {
                    console.log('Failed to add mod');
                    console.log(err);
                } else {
                    me.mods.push(id);
                    me.bot.sendMessage(channel, "Added " + author + " as a mod!");
                }
            }
        );
    };
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
                                        me.bot.sendMessage(channel, "Created command !"+command + ': ' + response).catch(err);
                                }
                            }
                        );
                    }
                }
            }
        );
    };
    this.delCommand = function(channel, command) {
        var me = this;
        var sql = this.connection.query('DELETE from commands WHERE name="'+command+'"',
            function(err, result) {
                if(err) {
                    console.log(err);
                } else{
                    me.bot.sendMessage(channel, "Deleted Command: !" + command);
                }
            });
    };
    this.editCommand = function(channel, command, response){
        console.log(command);
        console.log(response);
        if (!command || !response) {
            this.bot.sendMessage(channel, "Error in edit command syntax, please try again");
        }
        var me = this;
        var sql = this.connection.query('SELECT name,response FROM commands WHERE name =\"' + command + '\"',
            function(err, result){
                if (err){
                    console.log(err);
                } else {
                    if (!result.length){
                        me.bot.sendMessage(channel, "Error: Command !" + command + " does not exists!");
                    }
                    else{
                        var sql = me.connection.query('UPDATE commands SET `response`="' + response + '" WHERE name="'+command+'"',
                            function(err, result){
                                if (err){
                                        console.log(err);
                                } else {
                                        me.bot.sendMessage(channel, "Edited command !"+command + ' to ' + response).catch(err);
                                }
                            }
                        );
                    }
                }
            }
        );
    };
    this.gamble = function(channel, id, author, amount){
        var me = this;
        var sql = this.connection.query('SELECT hellos, time FROM hellos WHERE ID =\"' + id + '\"',
            function(err, result){
                if (err){
                    console.log(err);
                } else {
                    time = new Date().getTime() / 1000 ;
                    if (result.length){
                        console.log(result);
                        currentAmount = parseInt(result[0].hellos,10);
                        if (time - result[0].time >= 30){
                            if (amount <= currentAmount && amount > 0) {
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
                                sql = me.connection.query('UPDATE hellos SET `hellos`=' + newAmount+ ', `time`=' +time+' WHERE `ID`="' + id+ '";',
                                    function(err, result){
                                        if (err){
                                            console.log("Failed to update");
                                            console.log(err);
                                        }
                                    }
                                );
                                if (result[0].name != author) {
                                    sql = me.connection.query('UPDATE name SET name = "' + author+ '" WHERE ID=' + id,
                                        function(err, result) {
                                            if (err) {
                                                console.log(err);
                                            }
                                    });
                                }
                            } else {
                                me.bot.sendMessage(channel, "HEY " + author+ " THAT'S AN INVALID BET YOU FUCK!");
                            }
                        } else{
                            console.log("Please wait " + (30-(time-result[0].time)) + " more seconds before gambling again");
                        }
                    } else{
                        me.createHellosEntry(channel, id, author, time);
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
    this.createHellosEntry = function(channel, id, author, time){
        this.bot.sendMessage(channel, author + " has no hellos. Um hello?");
        sql = this.connection.query('INSERT INTO hellos (`ID`, `time`, `name`) VALUES ("'+id+'", '+time+',"'+author+'");',
            function(err, result){
                if (err){
                    console.log("Failed to insert");
                    console.log(err);
                }
            }
        );
    };
    this.hellos = function(channel, id, author){
        var me = this;
        var sql = this.connection.query('SELECT hellos, time FROM hellos WHERE ID =\"' + id + '\"',
            function(err, result){
                if (err) {
                    console.log(err);
                } else {
                    if (result.length){
                        console.log(result);
                        me.bot.sendMessage(channel, author + ", You have " + result[0].hellos + " hellos!");
                        if (result[0].name != author) {
                            sql = me.connection.query('UPDATE hellos SET name = "' + author+ '" WHERE ID=' + id,
                                function(err, result) {
                                    if (err) {
                                        console.log(err);
                                    }
                                });
                        }
                    } else{
                        me.createHellosEntry(channel, id, author, new Date().getTime() / 1000 );
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
                        var messages = '      HELLOS LEADERBOARD\n------------------------------------\n';
                        result.forEach(function(element, index, array){
                            messages += element.name + ": " + element.hellos + '\n';
                        });
                        me.bot.sendMessage(channel, messages);

                    }
                }
            });
    };

    var express = require('express');
    var app = express();
    app.get('/', function(req, res) {
        var sql = me.connection.query('SELECT * FROM commands',
            function(err, result) {
                if(err) {
                    console.log(err);
                    console.log('Could not fetch commands');
                } else {
                    messages = '<tr>\n<th>Command</th>\n<th>Response</th>\n</tr>\n';
                    result.forEach(function(element, index, array){
                            messages += '<tr>\n' + '<td>' + element.name + '</td>\n<td>' + element.response + '</td>\n</tr>';
                    });
                    messages += '</table>';
                    res.write('<html><head></head><body>');
                    res.write('<style>\ntable, th, td {\nborder: 1px solid black;\nborder-collapse: collapse;\n}\n</style>');
                    res.write('<table style="width:100%">');
                    res.write(messages);
                    res.end('</body></html>');
                }
            });
    });
    app.listen(3001);

    console.log('Listening on port 3001...');
}

SWBot.prototype.login = function () {
    this.bot.login(settings.discordLogin, settings.discordPw).then(success).catch(err);
};

SWBot.prototype.listen = function () {
    var me = this;
    setInterval(this.giveHellos, settings.hellosTime, me, null, 'all', 1);
    this.bot.on("message", function (msg) {
        if (msg.author.name != this.user.name){
            console.log("received message: " + msg.cleanContent + " from " + msg.author.name);
            message = msg.cleanContent.split('"');
            commands = message[0].trim().split(' ');
            command = commands[0];
            switch(command){
                case '!addcom':
                    if (me.mods.indexOf(msg.author.id) != -1) {
                        me.addCommand(msg.channel, commands[1].substring(1), commands.slice(2).join(' '));
                    }
                    break;
                case '!gamble':
                    me.gamble(msg.channel, msg.author.id, msg.author.name, parseInt(commands[1],10));
                    break;
                case '!hellos':
                    me.hellos(msg.channel, msg.author.id, msg.author.name);
                    break;
                case '!give':
                    if (me.mods.indexOf(msg.author.id) != -1) {
                        me.giveHellos(me, msg.channel, message[1], parseInt(message[2],10));
                        if (message[1] == 'all'){
                            me.bot.sendMessage(msg.channel, "Gave " + message[2] + " hellos to everyone. Like hello?");
                        }
                    }
                    break;
                case '!leaderboard':
                    time = new Date().getTime() / 1000;
                    if ( time - me.leaderboardCD > settings.leaderCD) {
                        me.showLeaderboard(msg.channel);
                        me.leaderboardCD = time;
                    } else {
                        console.log("Leadboard on CD");
                    }
                    break;
                case '!delcom':
                    if (me.mods.indexOf(msg.author.id) != -1) {
                        me.delCommand(msg.channel, commands[1].substring(1));
                    }
                    break;
                case '!editcom':
                    if (me.mods.indexOf(msg.author.id) != -1) {
                        me.editCommand(msg.channel, commands[1].substring(1), commands.slice(2).join(' '));
                    }
                    break;
                case '!addmod':
                    if(settings.discordOwner == msg.author.id) {
                        newMod = '';
                        msg.channel.server.members.forEach(function(element, index, array){
                            if(element.username == message[1]) {
                                newMod = element.id;
                            }
                        });
                        if(newMod !== '') {
                            me.addMod(msg.channel, newMod, message[1]);
                        } else {
                            console.log("Couldn't find ID");
                        }
                    }
                    break;
                default:
                    if(command[0][0] == '!') {
                        me.handleMsg(msg.channel, commands[0].substring(1));
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

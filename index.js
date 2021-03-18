const { CommandoClient } = require('discord.js-commando');
const { Structures, MessageEmbed, MessageAttachment } = require('discord.js');
const path = require('path');
const { prefix, token, discord_owner_id } = require('./config.json');
const db = require('quick.db');
const Canvas = require('canvas');

Structures.extend('Guild', function(Guild) {
  class MusicGuild extends Guild {
    constructor(client, data) {
      super(client, data);
      this.musicData = {
        queue: [],
        isPlaying: false,
        nowPlaying: null,
        songDispatcher: null,
        skipTimer: false, // only skip if user used leave command
        loopSong: false,
        loopQueue: false,
        volume: 1
      };
      this.triviaData = {
        isTriviaRunning: false,
        wasTriviaEndCalled: false,
        triviaQueue: [],
        triviaScore: new Map()
      };
    }
  }
  return MusicGuild;
});

const client = new CommandoClient({
  commandPrefix: prefix,
  owner: discord_owner_id
});

client.registry
  .registerDefaultTypes()
  .registerGroups([
    ['music', ':notes: Music Command Group:'],
    ['gifs', ':film_frames: Gif Command Group:'],
    ['other', ':loud_sound: Other Command Group:'],
    ['guild', ':gear: Guild Related Commands:'],
    ['speedrun', ':athletic_shoe: Speedrun Related Commands:']
  ])
  .registerDefaultGroups()
  .registerDefaultCommands({
    eval: false,
    prefix: false,
    commandState: false
  })
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', () => {
  console.log(`${client.user.tag} is Ready!`);
  client.user.setActivity(`${prefix}help`, {
    type: 'WATCHING',
    url: 'https://github.com/galnir/Master-Bot'
  });
  const Guilds = client.guilds.cache.map(guild => guild.name);
  console.log(Guilds, 'Connected!');
  // Registering font For Cloud Services
  Canvas.registerFont('./resources/welcome/OpenSans-Light.ttf', {
    family: 'Open Sans Light'
  });
});
client.on('voiceStateUpdate', async (___, newState) => {
  if (
    newState.member.user.bot &&
    !newState.channelID &&
    newState.guild.musicData.songDispatcher &&
    newState.member.user.id == client.user.id
  ) {
    newState.guild.musicData.queue.length = 0;
    newState.guild.musicData.songDispatcher.end();
    return;
  }
  if (
    newState.member.user.bot &&
    newState.channelID &&
    newState.member.user.id == client.user.id &&
    !newState.selfDeaf
  ) {
    newState.setSelfDeaf(true);
  }
});

client.on('guildMemberAdd', async member => {
  //Grab DB 1 get
  const serverSettingsFetch = db.get(member.guild.id);
  if (!serverSettingsFetch || serverSettingsFetch == null) return;

  const welcomeMsgSettings = serverSettingsFetch.serverSettings.welcomeMsg;
  if (welcomeMsgSettings == undefined) return;

  if (welcomeMsgSettings.status == 'no') return;

  if (welcomeMsgSettings.status == 'yes') {
    var applyText = (canvas, text) => {
      const ctx = canvas.getContext('2d');
      let fontSize = 70;

      do {
        ctx.font = `${(fontSize -= 10)}px Open Sans Light`; // This needs to match the family Name on line 65
      } while (ctx.measureText(text).width > canvas.width - 300);

      return ctx.font;
    };
    
    // Customizable Welcome Image Options
    var canvas = await Canvas.createCanvas(
      welcomeMsgSettings.imageWidth,
      welcomeMsgSettings.imageHeight
    );
    var ctx = canvas.getContext('2d');

    // Background Image Options
    var background = await Canvas.loadImage(welcomeMsgSettings.wallpaperURL);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Background Image Border Options
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Upper Text Options Default
    if (welcomeMsgSettings.topImageText == 'default') {
      ctx.font = '26px Open Sans Light'; // This needs to match the family Name on line 65
      ctx.fillStyle = '#FFFFFF'; // Main Color of the Text on the top of the welcome image
      ctx.fillText(
        `Welcome to ${member.guild.name}`, //<-- didn't play nice being stored in DB -Default
        canvas.width / 2.5,
        canvas.height / 3.5
      );
      ctx.strokeStyle = `#FFFFFF`; // Secondary Color of Text on the top of welcome for depth/shadow the stroke is under the main color
      ctx.strokeText(
        `Welcome to ${member.guild.name}`, //<-- didn't play nice being stored in DB -Default
        canvas.width / 2.5,
        canvas.height / 3.5
      );
    } else {
      
      // Upper Text Options DB
      ctx.font = '26px Open Sans Light'; // if the font register changed this needs to match the family Name on line 65
      ctx.fillStyle = '#FFFFFF'; // Main Color of the Text on the top of the welcome image
      ctx.fillText(
        welcomeMsgSettings.topImageText,
        canvas.width / 2.5,
        canvas.height / 3.5
      );
      ctx.strokeStyle = `#FFFFFF`; // Secondary Color of Text on the top of welcome for depth/shadow the stroke is under the main color
      ctx.strokeText(
        welcomeMsgSettings.topImageText,
        canvas.width / 2.5,
        canvas.height / 3.5
      );
    }
   
    // Lower Text Options Defaults
    if (welcomeMsgSettings.bottomImageText == 'default') {
      ctx.font = applyText(canvas, `${member.displayName}!`);
      ctx.fillStyle = '#FFFFFF'; // Main Color for the members name for the welcome image
      ctx.fillText(
        `${member.displayName}!`, //<-- didn't play nice being stored in DB -Default
        canvas.width / 2.5,
        canvas.height / 1.8
      );
      ctx.strokeStyle = `#FF0000`; // Secondary Color for the member name to add depth/shadow to the text
      ctx.strokeText(
        `${member.displayName}!`, //<-- didn't play nice being stored in DB -Default
        canvas.width / 2.5,
        canvas.height / 1.8
      );
    } else {
      //Lower Text Options DB
      ctx.font = applyText(canvas, `${member.displayName}!`);
      ctx.fillStyle = '#FFFFFF'; // Main Color for the members name for the welcome image
      ctx.fillText(
        welcomeMsgSettings.bottomImageText,
        canvas.width / 2.5,
        canvas.height / 1.8
      );
      ctx.strokeStyle = `#FF0000`; // Secondary Color for the member name to add depth/shadow to the text
      ctx.strokeText(
        welcomeMsgSettings.bottomImageText,
        canvas.width / 2.5,
        canvas.height / 1.8
      );
    }
    
    // Avatar Shape Options
    ctx.beginPath();
    ctx.arc(125, 125, 100, 0, Math.PI * 2, true); // Shape option (circle)
    ctx.closePath();
    ctx.clip();

    const avatar = await Canvas.loadImage(
      member.user.displayAvatarURL({
        format: 'jpg'
      })
    );
    ctx.drawImage(avatar, 25, 25, 200, 200);
    // Image is Built and Ready
    const attachment = new MessageAttachment(
      canvas.toBuffer(),
      'welcome-image.png'
    );
    
    // Welcome Embed Report
    var embed = new MessageEmbed()
      .setColor(`RANDOM`)
      .attachFiles(attachment)
      .setImage('attachment://welcome-image.png')
      .setFooter(`Type help for a feature list!`)
      .setTimestamp();
    if (welcomeMsgSettings.embedTitle == 'default') {
      embed.setTitle(
        `:speech_balloon: Hey ${member.displayName}, You look new to ${member.guild.name}!` //<-- didn't play nice being stored in DB -Default
      );
    } else embed.setTitle(welcomeMsgSettings.embedTitle);
    
    // Sends a DM if set to or if destenation is not present in DB(pre channel option users)
    if (
      welcomeMsgSettings.destination == 'direct message' ||
      !welcomeMsgSettings.destination
    )
      try {
        await member.user.send(embed);
      } catch {
        console.log(`${member.user.username}'s dms are private`);
      }
    
    // Sends to assigned Channel from DB
    if (welcomeMsgSettings.destination != 'direct message') {
      const channel = member.guild.channels.cache.find(
        channel => channel.name === welcomeMsgSettings.destination
      );
      await channel.send(`${member}`);
      await channel.send(embed);
    }
  }
});

client.login(ODIxNzE5NDgwMjM2NTA3MTM4.YFHz5g.sVtbyHUBgr4HOKWN95bipv91P2A);

import discord, { MessageEmbed } from "discord.js";
import Cadence from "../Cadence";
import BaseCommand from "./Cadence.BaseCommand";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";
import fs from 'fs';
import path from 'path';
import Db from "./Cadence.Db";
import EmbedHelper, { EmbedColor } from "./Cadence.Embed";
import CadenceLavalink from "./Cadence.Lavalink";

export default class CadenceDiscord {

    private static _instance: CadenceDiscord = null;
    private logger: Logger = null;

    public Client: discord.Client = null;
    private _statusWebhook: discord.WebhookClient = null;
    private _statsWebhook: discord.WebhookClient = null;

    private _commandsPath: string = "";
    private _commands: discord.Collection<string, BaseCommand> = null;
    private _aliases: { [k: string]: string } = null;

    private _prefixes: Map<string, string> = null;

    public sendStatus(text: string): void {
        this._statusWebhook.send({ embeds: [ EmbedHelper.generic(text, EmbedColor.Debug) ]});
    }
s
    public sendStats(embed: MessageEmbed): void {
        this.logger.log('sent stats to discord log');
        this._statsWebhook.send({ embeds: [ embed ]});
    }

    public resolveGuildNameAndId(guild: discord.Guild): string {
        return guild.name + ' (' + guild.id + ')';
    }

    public getServerPrefix(guildId: string): string {
        if (!this._prefixes) return Cadence.DefaultPrefix;
        if (!this._prefixes.has(guildId)) return Cadence.DefaultPrefix;
        else return this._prefixes.get(guildId);
    }

    public setServerPrefix(guildId: string, prefix: string, updateBd: boolean = true): void {
        if (!this._prefixes) return;
        if (this._prefixes.has(guildId)) this._prefixes.delete(guildId);

        this._prefixes.set(guildId, prefix);
        
        if (updateBd)
            Db.getInstance().setServerPrefix(guildId, prefix);
    }

    public getAllCommands(): discord.Collection<string, BaseCommand> {
        return this._commands;
    }

    private async OnReady(): Promise<void> {
        this.logger.log('successfully connected to discord as ' + this.Client.user.tag);
        this.Client.user.setActivity({
            type: "LISTENING",
            name: Cadence.DefaultPrefix + 'help'
        });
        
        if (this.Client.user.username != Cadence.BotName && Cadence.BotName.length > 0) {
            const _old = this.Client.user.username;
            this.Client.user.setUsername(Cadence.BotName);
            this.logger.log('changed bot name to predefined ' + Cadence.BotName + ' (old ' + _old + ')');
        }

        await this._loadAllCommands();
        
        if (Cadence.IsMainInstance)
            await this._loadAllPrefixes();
    }

    private async OnMessage(m: discord.Message): Promise<void> {
        if (m.author.bot) return;
        if (m.channel.type == 'DM') return;

        const prefix = Cadence.IsMainInstance ? this.getServerPrefix(m.guildId) : Cadence.DefaultPrefix;

        if (!m.content.startsWith(prefix) && !m.content.startsWith(Cadence.DefaultPrefix)) return;

        let args = [];
        if (!m.content.startsWith(prefix)) {
            args = m.content.slice(Cadence.DefaultPrefix.length).trim().split(/ +/);
        } else {
            args = m.content.slice(prefix.length).trim().split(/ +/);
        }

        let command = args.shift().toLocaleLowerCase();

        if (!this._commands.has(command) && this._aliases.hasOwnProperty(command)) {
            command = this._aliases[command];
        }

        try {
            this._commands.get(command)?.run(m, args);
        } catch (e) {
            this.logger.log('could not execute command ' + command + ' in ' + this.resolveGuildNameAndId(m.guild) + ': ' + e)
        }
    }

    private async OnVoiceUpdate(oldState: discord.VoiceState, newState: discord.VoiceState): Promise<void> {
        if (oldState.member.id != this.Client.user.id) return;

        if (

            // If the bot has been unmuted
            // Or the bot has been deafen/undeafen
            // We have to reload the player (thanks to lavalink lib)

            ( newState.channel &&
            newState.channelId &&
            !newState.mute &&
            !newState.serverMute &&
            newState.sessionId ) &&

            ( oldState.channel &&
            oldState.channelId &&
            ( oldState.mute || oldState.serverMute ) &&
            oldState.sessionId )

            || newState.serverDeaf != oldState.serverDeaf
        ) {
            const player = CadenceLavalink.getInstance().getPlayerByGuildId(newState.guild.id);
            if (!player) return;

            await player.pause();
            await this._wait(1000);
            await player.resume();
        }
    }

    private async _loadAllPrefixes(): Promise<void> {
        this._prefixes = new Map<string, string>();

        const prefixes: any[] = await Db.getInstance().getAllPrefixes();
        for (let i = 0; i < prefixes.length; ++i) {
            if (Cadence.Debug)
                this.logger.log('loaded custom prefix ' + prefixes[i].prefix + ' for guild ' + prefixes[i].guild_id);
            this._prefixes.set(prefixes[i].guild_id, prefixes[i].prefix);
        }

        this.logger.log('loaded all custom prefixes');
    }

    private async _loadAllCommands(): Promise<void> {
        this.logger.log('loading all comands');

        this._commands = new discord.Collection<string, BaseCommand>();
        this._aliases = {};

        if (!fs.existsSync(this._commandsPath)) fs.mkdirSync(this._commandsPath);

        const commandFiles = fs.readdirSync(this._commandsPath).filter(f => f.endsWith('.js'));
        for (const f of commandFiles) {
            const commandModule: BaseCommand = (await import(this._resolveCommandPath(f)))['default'];
            this._commands.set(commandModule.name, commandModule);

            if (commandModule.aliases && commandModule.aliases.length > 0) {
                for (const a of commandModule.aliases) {
                    this._aliases[a] = commandModule.name;
                }
            }

            if (Cadence.Debug)
                this.logger.log('loaded command ' + commandModule.name);
        }

    }
    
    private _resolveCommandPath(commandName: string): string {
        return path.join(this._commandsPath, commandName);
    }

    private _wait(ms: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(resolve, ms);
        });
    }

    private constructor() {
        this.logger = new Logger('cadence-discord');
    }

    public async init(): Promise<void> {
        this.Client = new discord.Client({
            intents: [
                discord.Intents.FLAGS.GUILDS,
                discord.Intents.FLAGS.GUILD_MESSAGES,
                discord.Intents.FLAGS.GUILD_VOICE_STATES,
                discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            ]
        });

        this._statusWebhook = new discord.WebhookClient({ url: Config.getInstance().getKeyOrDefault('StatusWebhook', '')});
        this._statsWebhook = new discord.WebhookClient({ url: Config.getInstance().getKeyOrDefault('StatsWebhook', '')});

        this._commandsPath = path.join(Cadence.BaseDir, 'cmds');

        if (Cadence.Debug)
            this.logger.log('established commands path to ' + this._commandsPath);

        if (Cadence.DefaultPrefix.length <= 0) {
            this.logger.log('cannot start discord module, default prefix is empty');
            process.exit(1);
        }

        this.Client.once('ready', this.OnReady.bind(this));
        this.Client.on('messageCreate', this.OnMessage.bind(this));
        this.Client.on('voiceStateUpdate', this.OnVoiceUpdate.bind(this));

        this.logger.log('logging to discord network');
        await this.Client.login(
            Cadence.Debug ?
                Config.getInstance().getKeyOrDefault('BotTokenDebug', '') :
                Config.getInstance().getKeyOrDefault('BotToken', '')
        ).catch(e => {
            this.logger.log('could not connect to discord network ' + e);
            process.exit(1);
        });
    }

    public static getInstance(): CadenceDiscord {
        if (!this._instance) {
            this._instance = new CadenceDiscord();
        }

        return this._instance;
    }

}
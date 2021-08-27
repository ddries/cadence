import discord from "discord.js";
import Cadence from "../Cadence";
import BaseCommand from "./Cadence.BaseCommand";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";
import fs from 'fs';
import path from 'path';

export default class CadenceDiscord {

    private static _instance: CadenceDiscord = null;
    private logger: Logger = null;

    public Client: discord.Client = null;

    private _commandsPath: string = "";
    private _commands: discord.Collection<string, BaseCommand> = null;
    private _aliases: { [k: string]: string } = null;

    private async OnReady(): Promise<void> {
        this.logger.log('successfully connected to discord as ' + this.Client.user.tag);
        this.Client.user.setActivity({
            type: "LISTENING",
            name: Config.getInstance().getKeyOrDefault('BotDefaultPrefix', '') + 'help'
        });
        
        if (this.Client.user.username != Cadence.BotName && Cadence.BotName.length > 0) {
            const _old = this.Client.user.username;
            this.Client.user.setUsername(Cadence.BotName);
            this.logger.log('changed bot name to predefined ' + Cadence.BotName + ' (old ' + _old + ')');
        }

        await this._loadAllCommands();
    }

    private async OnMessage(m: discord.Message): Promise<void> {
        if (m.author.bot) return;
        if (m.channel.type == 'DM') return;

        const args = m.content.slice(Cadence.DefaultPrefix.length).trim().split(/ +/);
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

    public resolveGuildNameAndId(guild: discord.Guild): string {
        return guild.name + ' (' + guild.id + ')';
    }

    private constructor() {
        this.logger = new Logger('cadence-discord');
    }

    public async init(): Promise<void> {
        this.Client = new discord.Client({
            intents: [
                discord.Intents.FLAGS.GUILDS,
                discord.Intents.FLAGS.GUILD_MESSAGES
            ]
        });

        this._commandsPath = path.join(Cadence.BaseDir, 'cmds');

        if (Cadence.Debug)
            this.logger.log('established commands path to ' + this._commandsPath);

        if (Cadence.DefaultPrefix.length <= 0) {
            this.logger.log('cannot start discord module, default prefix is empty');
            process.exit(1);
        }

        this.Client.once('ready', this.OnReady.bind(this));
        this.Client.on('messageCreate', this.OnMessage.bind(this));

        this.logger.log('logging to discord network');
        await this.Client.login(Config.getInstance().getKeyOrDefault('BotToken', '')).catch(e => {
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
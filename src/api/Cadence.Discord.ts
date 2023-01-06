import discord, { MessageEmbed } from "discord.js";
import Cadence from "../Cadence";
import BaseCommand from "./Cadence.BaseCommand";
import Config from "./Cadence.Config";
import Logger from "./Cadence.Logger";
import fs from 'fs';
import path from 'path';
import EmbedHelper, { EmbedColor } from "./Cadence.Embed";
import CadenceMemory from "./Cadence.Memory";
import CadenceWebsockets from "./Cadence.Websockets";

export default class CadenceDiscord {

    private static _instance: CadenceDiscord = null;
    private logger: Logger = null;

    public Client: discord.Client = null;

    private _statusWebhook: discord.WebhookClient = null;
    private _statsWebhook: discord.WebhookClient = null;

    private _commandsPath: string = "";
    private _commands: discord.Collection<string, BaseCommand> = null;

    public sendStatus(text: string): void {
        this._statusWebhook.send({ embeds: [ EmbedHelper.generic(text, EmbedColor.Debug) ]});
    }

    public sendStats(embed: MessageEmbed): void {
        this.logger.log('sent stats to discord log');
        this._statsWebhook.send({ embeds: [ embed ]});
    }

    public resolveGuildNameAndId(guild: discord.Guild): string {
        return guild.name + ' (' + guild.id + ')';
    }

    public getAllCommands(): discord.Collection<string, BaseCommand> {
        return this._commands;
    }

    private async OnReady(): Promise<void> {
        this.logger.log('successfully connected to discord as ' + this.Client.user.tag);
        this.Client.user.setActivity({
            type: "LISTENING",
            name: Cadence.DefaultPrefix
        });
        
        if (this.Client.user.username != Cadence.BotName && Cadence.BotName.length > 0) {
            const _old = this.Client.user.username;
            this.Client.user.setUsername(Cadence.BotName);
            this.logger.log('changed bot name to predefined ' + Cadence.BotName + ' (old ' + _old + ')');
        }

        await this._loadAllCommands();
    }

    private async OnInteraction(i: discord.Interaction): Promise<void> {
        if (i.user.bot) return; // ??
        if (!i.isCommand()) return;
        if (!i.inGuild()) return;

        let command = i.commandName.toLocaleLowerCase();

        try {
            this._commands.get(command)?.run(i);
        } catch (e) {
            this.logger.log('could not execute command ' + command + ' in ' + this.resolveGuildNameAndId(i.guild) + ': ' + e);
        } finally {
            const server = CadenceMemory.getInstance().getConnectedServer(i.guildId);
            if (server && !server.textChannel) {
                server.textChannel = i.channel;
            }
        }
    }

    private async OnVoiceUpdate(oldState: discord.VoiceState, newState: discord.VoiceState): Promise<void> {
        if (newState.member.id != this.Client.user.id && newState.channelId != oldState.channelId) {
            CadenceWebsockets.getInstance().send({
                i: 'voice_update',
                o: CadenceWebsockets.wsUser,
                x: "user:" + newState.member.id,
                r: "",
                p: {
                    guild: {
                        id: newState.guild?.id ? newState.guild.id : "",
                        name: newState.guild?.name ? newState.guild.name : "",
                        icon: newState.guild?.icon ? newState.guild.icon : ""
                    },
                    voice: {
                        id: newState.channelId ? newState.channelId : "",
                        name: newState.channel?.name ? newState.channel.name : "",
                        listeners: newState.channel?.members.size ? newState.channel?.members.size : 0
                    }
                }
            });
        }

        if (oldState.member.id != this.Client.user.id) return;

        const server = CadenceMemory.getInstance().getConnectedServer(oldState.guild.id);
        if (!server) return;

        if (newState.channel && newState.sessionId && (oldState.channelId != newState.channelId || newState.channelId != server.voiceChannelId)) {
            server.voiceChannelId = newState.channelId;
            server.player.setPaused(true);
            (new Promise(res => setTimeout(res, 1000))).then(() => server.player.setPaused(false));
            this.logger.log('updated voice channel id to (' + server.voiceChannelId + ')');
        }
    }

    private async _loadAllCommands(): Promise<void> {
        this.logger.log('loading all comands');

        this._commands = new discord.Collection<string, BaseCommand>();

        if (!fs.existsSync(this._commandsPath)) fs.mkdirSync(this._commandsPath);

        const commandFiles = fs.readdirSync(this._commandsPath).filter(f => f.endsWith('.js'));
        for (const f of commandFiles) {
            const commandModule: BaseCommand = (await import(this._resolveCommandPath(f)))['Command'];
            if (!commandModule) continue;
            
            this._commands.set(commandModule.name, commandModule);
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
        this.logger = new Logger('cadence-discord', 'discord.log');
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
        this.Client.on('interactionCreate', this.OnInteraction.bind(this));
        this.Client.on('voiceStateUpdate', this.OnVoiceUpdate.bind(this));

        this.logger.log('logging to discord network');
        await this.Client.login(
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
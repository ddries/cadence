import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandType  } from 'discord-api-types/v9';
import { ContextMenuCommandBuilder  } from '@discordjs/builders';
import fs from 'fs';
import path from 'path';
import BaseCommand from './api/Cadence.BaseCommand';

/**
 * self contained class file executable
 * when triggered by external actions foreign to cadence
 * it will fetch all existing valid slash commands under cmds/ directory
 * and upload them to the discord api
 * 
 * if no guild id is provided, they are uploaded to production (globally)
 * 
 * usage: node SlashBuilder.js <client id> [guild id]
 */

class SlashBuilder {

    public static async run(): Promise<void> {
        const commandFiles = fs.readdirSync(path.join(__dirname, 'cmds')).filter(f => f.endsWith('.js'));

        let clientId: string = "";
        let guildId: string = "";
        let removeAll: boolean = false;

        if (process.argv.length > 2)
            clientId = process.argv[2];

        if (process.argv.length > 3)
            guildId = process.argv[3];

        if (process.argv.length > 4)
            if (process.argv[4] == 'true') removeAll = true;

        if (!clientId) {
            console.error("error!\tno client id provided");
            process.exit(1);
        }

        if (!guildId) {
            console.log("info\tnamespacing to production (globally)");
        } else {
            console.log("info\tnamespacing to guild (testing) " + guildId);
        }

        const rawConfig: string = fs.readFileSync(path.join(__dirname, 'cadence.json'), 'utf-8');

        if (!rawConfig) {
            console.error('error!\tcould not read cadence.json');
            process.exit(1);
        }

        let token: string = "";

        try {
            token = JSON.parse(rawConfig)['BotToken'];
        } catch (e) {
            console.error('error!\tcould not read bot token: ' + e);
            process.exit(1);
        }

        if (!token) {
            console.error('error!\tno token given');
            process.exit(1);
        }

        const rest = new REST({ version: '9' }).setToken(token);

        // if (removeAll) {
        //     const uploadedCommands: Array<{ name: string, id: string }> = [];

        //     if (guildId) {
        //         const _result = (await rest.get(
        //             Routes.applicationGuildCommands(clientId, guildId)
        //         ) as Array<any>);
        //         for (const _c of _result) {  uploadedCommands.push({ name: _c.name, id: _c.id }); }
        //     } else {
        //         const _result = (await rest.get(
        //             Routes.applicationCommands(clientId)
        //         ) as Array<any>);
        //         for (const _c of _result) {  uploadedCommands.push({ name: _c.name, id: _c.id }); }
        //     }
    
        //     for (const c of uploadedCommands) {
        //         console.log('info\tremoving ' + c.name + ' (' + c.id + ')');
        //         if (guildId) {
        //             await rest.delete(
        //                 Routes.applicationGuildCommand(clientId, guildId, c.id)
        //             );
        //         } else {
        //             await rest.delete(
        //                 Routes.applicationCommand(clientId, c.id)
        //             );
        //         }
        //     }

        //     return;
        // }

        // const commands: BaseCommand[] = [];
        // for (const f of commandFiles) {
        //     const c: BaseCommand = (await import(path.join(__dirname, 'cmds', f)))['Command'];
        //     if (!c) continue;
        //     if (c.disabled) continue;
        //     commands.push(c.slashCommandBody);
        //     console.log('info\tfetched command ' + c.name);
        // }

        const data = new ContextMenuCommandBuilder()
            .setName("Play")
            .setType(3);

        try {
            if (guildId) {
                // await rest.put(
                //     Routes.applicationGuildCommands(clientId, guildId),
                //     { body: commands }
                // );
                await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: [ data.toJSON() ] }
                );
            } else {
                // await rest.put(
                //     Routes.applicationCommands(clientId),
                //     { body: commands }
                // );
                await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: [ data.toJSON() ] }
                );
            }

            console.log('info\tsuccessfully uploaded commands');
        } catch(e) {
            console.log('error!\tcould not upload commands: ' + e);
        }
    }
}

(async () => {
    await SlashBuilder.run();
})();
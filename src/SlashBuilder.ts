import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
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

    public static async run(isMainBranch: boolean): Promise<void> {
        const commandFiles = fs.readdirSync(path.join(__dirname, 'cmds')).filter(f => f.endsWith('.js'));

        let clientId: string = "";
        let guildId: string = "";

        if (process.argv.length > 2)
            clientId = process.argv[2];

        if (process.argv.length > 3)
            guildId = process.argv[3];

        if (!clientId) {
            console.error("error!\tno client id provided");
            process.exit(1);
        }

        if (!guildId) {
            console.log("info\tuploading to production (globally)");
        } else {
            console.log("info\tuploading for guild (testing) " + guildId);
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

        const commands: BaseCommand[] = [];
        for (const f of commandFiles) {
            const c: BaseCommand = (await import(path.join(__dirname, 'cmds', f)))['Command'];
            if (!c) continue;
            commands.push(c.slashCommandBody);
            console.log('info\tfetched command ' + c.name);
        }

        const rest = new REST({ version: '9' }).setToken(token);

        try {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );

            console.log('info\tsuccessfully uploaded commands');
        } catch(e) {
            console.log('error!\tcould not upload commands: ' + e);
        }
    }
}

(async () => {
    const isMainBranch = process.argv.length > 3;
    await SlashBuilder.run(isMainBranch);
})();
export default interface CadenceConfig {
    // Global config
    Debug: boolean,
    Version: string,
    ApiUrl: string,
    StaffIds: Array<string>,

    WebToken?: string,
    BotlistToken?: string,

    // Discord related config
    BotName: string,
    BotDefaultPrefix: string,
    Token: string,

    AdminWebhook?: string,
    StatusWebhook?: string,
    LogWebhook?: string,

    // MySql related config
    MySqlHost?: string,
    MySqlPort?: number,
    MySqlDatabase?: string,
    MySqlUsername?: string,
    MySqlPassword?: string,
}
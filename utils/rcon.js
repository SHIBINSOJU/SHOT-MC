
const { Rcon } = require('rcon-client');

async function sendRconCommand(options, command) {
    const rcon = new Rcon({
        host: options.host,
        port: options.port,
        password: options.password,
    });

    try {
        await rcon.connect();
        const response = await rcon.send(command);
        await rcon.end();
        return response;
    } catch (error) {
        console.error('RCON Error:', error);
        throw new Error('Failed to send RCON command.');
    }
}

module.exports = { sendRconCommand };

# ShotMC Manager

A Discord bot for managing Minecraft servers (Java + Bedrock).

## Features

- **Server Setup:** Easily link your Minecraft server's IP, port, and edition.
- **RCON Setup:** Securely store your RCON port and password.
- **Live Status Updates:** Set a dedicated channel for live server status updates.
- **Info Commands:** Get live server status, player lists, UUIDs, and skins.
- **Whitelist Management:** Add or remove players from the whitelist via RCON.
- **Help Command:** A comprehensive list of all available commands.
- **Database Integration:** Uses MongoDB to store server information per guild.

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/shotmc-manager.git
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file:**
   - Copy the `.env.example` file to `.env`.
   - Fill in the required environment variables.
4. **Start the bot:**
   ```bash
   npm start
   ```

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token.
- `MONGO_URI`: Your MongoDB connection string.

## Commands

- `/help`: Lists all available commands.
- `/setup-server <ip> <port> <edition>`: Sets up the Minecraft server details.
- `/setup-rcon <port> <password>`: Sets up the RCON details for the server.
- `/setup-status-channel <channel>`: Sets the channel for live server status updates.
- `/status`: Displays the live status of the Minecraft server.
- `/players`: Displays the list of online players.
- `/uuid <username>`: Fetches the Minecraft UUID of a player.
- `/skin <username>`: Shows the Minecraft skin of a player.
- `/whitelist add/remove <username>`: Manages the server whitelist.

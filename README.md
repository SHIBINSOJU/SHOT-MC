# ShotMC Manager

A Discord bot for managing Minecraft servers (Java + Bedrock), built with Node.js, `discord.js`, and MongoDB.

## Features

-   **Customizable Server Setup:** Link your server's IP, port, edition, and add custom details like a server name, description, banner, and thumbnail.
-   **Live Auto-Updating Status:** Set a dedicated channel where the bot automatically updates a professional-looking embed with live server info at an interval you choose.
-   **On-Demand Info:** Get an interactive server status with a paginated player list using `/status`. Fetch any player's skin or UUID.
-   **RCON Management:** Securely store RCON details to manage your server's whitelist directly from Discord.
-   **Database Integration:** Uses MongoDB to store all server configurations on a per-server (guild) basis.
-   **Reliable API:** Uses `api.mcsrvstat.us` for fast and reliable server status checks.

---

## Environment Variables

Before you start, create a `.env` file in the root of the project and add the following variables:

-   `DISCORD_TOKEN`: Your Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications).
-   `CLIENT_ID`: Your bot's Application ID (also from the Developer Portal).
-   `GUILD_ID`: Your test server's ID. (Used for instantly deploying commands for testing).
-   `MONGO_URI`: Your MongoDB connection string.

---

## Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/shotmc-manager.git](https://github.com/your-username/shotmc-manager.git)
    cd shotmc-manager
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create and fill in your `.env` file:**
    -   Use the `## Environment Variables` section above as a guide.

4.  **Deploy Slash Commands:**
    -   You must run this script **one time** before starting the bot to register your `/` commands with Discord.
    ```bash
    node deploy-commands.js
    ```
5.  **Start the bot:**
    ```bash
    node .
    ```

---

## ⚠️ Important Minecraft Server Setup

For the bot to correctly see your **Java Edition** server as "Online", you **must** enable query in your server's settings.

1.  Open your server's **`server.properties`** file.
2.  Find the line `enable-query=false`.
3.  Change it to **`enable-query=true`**.
4.  Restart your Minecraft server.

*This step is not needed for Bedrock Edition servers.*

---

## Commands

-   `/help`: Lists all available commands.

### Setup Commands
-   `/setup-server <ip> <port> [name] [edition] [description] [banner-url] [thumbnail-url]`: Sets up all the main details for your server.
-   `/setup-rcon <port> <password>`: Sets up the RCON details for the server.
-   `/setup-status-channel <channel>`: Sets the channel for the live auto-updating status message.
-   `/setup-status-interval <milliseconds>`: Sets the auto-update speed (e.g., `60000` for 1 minute).

### Info Commands
-   `/status`: Displays the live server status with an interactive "Playerlist" button.
-   `/players`: Displays the list of online players.
-   `/uuid <username>`: Fetches the Minecraft UUID of a player.
-   `/skin <username>`: Shows the Minecraft skin of a player.

### RCON Commands
-   `/whitelist add <username>`: Adds a player to the server's whitelist.
-   `/whitelist remove <username>`: Removes a player from the server's whitelist.
-   

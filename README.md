<div align="center">
  <img src="https://github.com/user-attachments/assets/4a274c60-0029-4b8b-a233-459d432faeff" alt="QubicLink Logo" width="400" height="400" />
  <h1>QubicLink</h1>
  <p>A production-grade identity bridge that securely links Discord identities with Qubic blockchain wallets, enabling automated, trustless, and on-chain portfolio-based role management.</p>
  <div>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
    <a href="https://hub.docker.com/r/thanishurs31/qubiclink"><img src="https://img.shields.io/docker/pulls/thanishurs31/qubiclink.svg" alt="Docker Pulls" /></a>
    <img src="https://img.shields.io/github/stars/thanishurs31/qubiclink" alt="GitHub stars">
    <img src="https://img.shields.io/github/forks/thanishurs31/qubiclink" alt="GitHub forks">
  </div>
  <br>
</div>

---

## About The Project

QubicLink solves a common problem in the web3 space: how to grant Discord roles based on a user's on-chain assets without compromising security or requiring users to perform complex actions like signing messages. This project provides a robust and automated solution that links a user's Discord identity to their Qubic wallet address in a trustless manner, then assigns roles based on the total value of their Qubic portfolio.

## Key Features

- **Trustless & No-Cost Wallet Verification:** Users prove wallet ownership by placing a temporary, fully refundable buy order on a public exchange. The bot verifies this specific on-chain action, ensuring ownership without requiring risky message signing or exposing private keys.
- **Dynamic & Automated Role Management:** Assign Discord roles automatically based on a user's total Qubic portfolio value. Create custom roles and balance thresholds (e.g., "Verified", "Whale", "Shark") directly from a secure admin dashboard.
- **Resilient Background Jobs:** Scheduled jobs periodically refresh user portfolios and reconcile Discord roles to ensure they always reflect on-chain reality.
- **Defense-in-Depth Security:** Strict CORS policy, JWT-based authentication, Zod schema validation, idempotent transaction processing to prevent replay attacks, and ownership conflict protection.
- **Admin Dashboard & Control:** A secure React SPA for operational visibility to manage wallets, users, and role thresholds.

---

## How It Works

```
1. User initiates verification on Discord with the /link <wallet_address> command.
   -> The bot generates a unique, cryptographically random number (e.g., 83192).

2. The user goes to a Qubic exchange (e.g., qubictrade.com) and places a temporary buy order for the 'GARTH' asset.
   -> Price: 1 QU
   -> Quantity: The exact random number from the bot (e.g., 83192).

3. An external service (EasyConnect) detects this specific bid order.
   -> Sends a webhook to the QubicLink API.

4. The QubicLink API verifies the bid order's details (Asset, Price, Quantity) against the challenge code it generated for that user's wallet.
   -> Securely links the user's Discord ID to their wallet address.

5. The user can immediately cancel their buy order on the exchange to recover their funds.

6. A background job calculates the user's total portfolio value and assigns the appropriate Discord roles based on predefined thresholds.
```

---

## Tech Stack

### Backend
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [discord.js](https://discord.js.org/)

### Frontend
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Material-UI](https://mui.com/)
- [TanStack Query](https://tanstack.com/query/latest)

### Deployment
- [Docker](https://www.docker.com/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional)

### Installation & Configuration

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/thanishurs31/qubiclink.git
    cd qubiclink
    ```

2.  **Install dependencies:**
    ```bash
    npm run install:all
    ```

3.  **Set up your environment:**
    Create a `.env` file in the project root and populate it with your credentials, following the `.env.example` file. See the [Environment Variables](#environment-variables) section for more details.

4.  **Run database migrations:**
    ```bash
    npx prisma migrate deploy
    ```

---

## Usage

-   **Development:**
    Run the backend and frontend concurrently.
    ```bash
    npm run dev
    ```

-   **Production:**
    Build the frontend and start the server.
    ```bash
    npm run build
    npm start
    ```

---

## Docker Deployment

The official image is available on [Docker Hub](https://hub.docker.com/r/thanishurs31/qubiclink).

### Prerequisites

1.  A PostgreSQL database hosted on a cloud provider (e.g., Railway, GCP, AWS).
2.  A `.env` file with all required variables, especially the `DATABASE_URL` for your external database.

### Running the Application

```bash
docker pull thanishurs31/qubiclink:latest
docker run -d -p 3000:3000 --name qubiclink --env-file ./.env thanishurs31/qubiclink:latest
```

---

## Environment Variables

| Variable             | Description                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`      | The token for your Discord bot.                                                                           |
| `CLIENT_ID`          | The client ID of your Discord application.                                                                |
| `GUILD_ID`           | The ID of the Discord server (guild).                                                                     |
| `ADMIN_PASSWORD`     | The password for the admin dashboard.                                                                     |
| `ADMIN_JWT_SECRET`   | A long, random secret for signing JWTs.                                                                   |
| `FRONTEND_URL`       | The full URL where the frontend is hosted (e.g., http://localhost:3000).                                  |
| `LOG_LEVEL`          | The logging level. Options: 'debug', 'info', 'warn', 'error'.                                             |
| `DATABASE_URL`       | The connection URL for your PostgreSQL database.                                                          |

---

## Discord Bot Setup

Properly configuring your bot in the Discord Developer Portal is crucial for QubicLink to function correctly.

### 1. Create the Bot Application

1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **New Application** and give it a name (e.g., "QubicLink").
3.  Navigate to the **Bot** tab and click **Add Bot**.

### 2. Configure Intents

Privileged Gateway Intents are required for the bot to see server members and assign roles.

1.  In the **Bot** tab, scroll down to the **Privileged Gateway Intents** section.
2.  Enable the **Server Members Intent**.
3.  Enable the **Message Content Intent**.

### 3. Configure Permissions & Scopes

You need to generate an invite link that grants the bot the correct permissions.

1.  Go to the **OAuth2 -> URL Generator** tab.
2.  In the **Scopes** section, select `bot` and `applications.commands`.
3.  In the **Bot Permissions** section that appears, select the following permissions:
    *   **Manage Roles:** Allows the bot to assign and remove roles based on portfolio value.
    *   **Send Messages:** Allows the bot to send verification instructions and confirmations.
    *   **Embed Links:** Required for the bot to send nicely formatted messages.
    *   **View Channels:** Allows the bot to see the channels in your server.

### 4. Add the Bot to Your Server

1.  Copy the generated URL at the bottom of the **URL Generator** page.
2.  Paste the URL into your browser, select the server you want to add the bot to, and click **Authorize**.

### 5. Enable User Install

For a better user experience, you can enable user installation.

1.  Go to the **Settings -> General** tab.
2.  In the **Installation** section, select **User Install**. This will allow users to add the bot to their own servers.
3.  You can also enable **Guild Install** if you want to allow server owners to add the bot.

After completing these steps, your bot will be ready to use with QubicLink.

---

## EasyConnect Webhook Setup

To enable automated wallet verification, you need to configure an external service to monitor the Qubic blockchain and notify QubicLink when a user creates their verification transaction. This guide uses [EasyConnect](https://ec-pre.kairos-tek.com/), a service that can watch for specific on-chain events and send webhooks.

The goal is to create an alert that triggers *only* when a user places the exact bid order that the QubicLink bot instructed them to.

### Configuration Steps:

1.  **Sign up on EasyConnect** and create a **New Alert**.

2.  **Set the Origin:** This tells EasyConnect what on-chain event to watch for.
    *   **Contract:** `Qubic Qx Smart Contract`
    *   **Method:** `AddToBidOrder`

3.  **Define the Conditions:** This ensures the alert only triggers for transactions that match our specific verification criteria.
    *   **`AssetName`** (string) `is` **`GARTH`**
    *   **`Price`** (number) `is` **`1`**
    *   **`NumberOfShares`** (number) `less than` **`100000`**

    *Note: The `NumberOfShares` is the random code generated for each user. This condition helps filter out irrelevant transactions.*

4.  **Configure the Notification:** This tells EasyConnect where to send the data when the conditions are met.
    *   **Webhook URL:** Set this to the public-facing URL of your QubicLink deployment, followed by the `/webhook/qubic` endpoint.
        *   **Example:** `http://<your_ip_or_domain>:3000/webhook/qubic`
    *   **Method:** Ensure the webhook is sent as a `POST` request.

Once configured, EasyConnect will send a detailed payload to your QubicLink instance every time a user correctly places their verification bid order, allowing the bot to finalize the verification.

---

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

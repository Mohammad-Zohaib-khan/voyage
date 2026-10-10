# Deploying Voyage to Microsoft Azure

This guide details how to deploy **Voyage** (Node 22 LTS, Express 5, React 19, Mongoose 9) to Microsoft Azure for production.

---

## 1. Readiness Assessment

| Requirement | Status | Notes |
| :--- | :--- | :--- |
| **Production Build** |  Ready | `npm run build` compiles both `@voyage/server` (`tsc`) and `@voyage/client` (`vite`) with zero errors. |
| **Unified Single Origin** |  Ready | In production, Express serves the static SPA (`CLIENT_DIST_DIR=client/dist`) and API (`/api/v1/*`), enabling `__Host-` Secure cookies without cross-origin friction. |
| **Reverse Proxy Support** |  Ready | Configured for `TRUST_PROXY=1` to trust Azure's TLS termination and forward client IPs. |
| **Health Checks** |  Ready | Endpoint at `GET /api/v1/health` responds with database connection status. |
| **Containerization** |  Ready | Multi-stage production [`Dockerfile`](../Dockerfile) with non-root user, slim Node 22 base, and native health check. |
| **Database** |  Ready | Compatible with **Azure Cosmos DB for MongoDB (vCore)** or **MongoDB Atlas on Azure**. |

---

## 2. Recommended Azure Architectures

### Architecture A: Azure Container Apps (Recommended)
- **Compute:** Azure Container Apps (serverless container hosting with auto-scaling to zero or minimum 1 replica).
- **Registry:** Azure Container Registry (ACR).
- **Database:** Azure Cosmos DB for MongoDB (vCore) or MongoDB Atlas.
- **Benefits:** Fast deployments, built-in TLS, simple environment management, scale-to-zero cost efficiency.

### Architecture B: Azure App Service (Linux Web App)
- **Compute:** Azure App Service Plan (B1 or P1v3, Linux, Node 22 LTS or custom container).
- **Database:** Azure Cosmos DB for MongoDB (vCore) or MongoDB Atlas.
- **Benefits:** Native continuous deployment from GitHub Actions, built-in custom domains and SSL certificates.

---

## 3. Required Environment Variables (Azure App Settings)

Configure these in the **Configuration / Environment Variables** section of your Azure Web App or Container App:

| Variable | Recommended Azure Value | Explanation |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production security guards, strict CSP, and caching. |
| `PORT` | `8080` (or `80`) | The port your container or App Service listens on. |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@<cosmos-or-atlas-host>/voyage?tls=true...` | Connection string to Azure Cosmos DB (vCore) or Atlas. |
| `SESSION_SECRET` | *32+ random characters* | Generates session encryption keys. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `SESSION_TTL_HOURS` | `168` | 7-day sliding session expiration. |
| `CORS_ORIGINS` | `https://<your-app>.azurewebsites.net` | Exact HTTPS URL where users access the app (no wildcards). |
| `TRUST_PROXY` | `1` | **Critical for Azure:** Informs Express to trust Azure's front-door TLS proxy for HTTPS and cookies. |
| `CLIENT_DIST_DIR` | `client/dist` | Directs Express to serve the built React client. Relative to the app root (the process must start from there, as `npm start` and the Docker image do). |
| `LOG_LEVEL` | `info` | Structured JSON log verbosity. |
| `SESSION_AUTO_REMOVE` | `native` | Keep `native` for MongoDB Atlas and Cosmos DB **vCore**. Use `interval` for Cosmos DB **RU-based** API for MongoDB, whose TTL indexes differ. |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | **App Service only.** The GitHub workflow uploads a ready-built package; stop Oryx from rebuilding it. |

> The app refuses to start in production if `SESSION_SECRET` is missing/short or `CORS_ORIGINS` is not an exact `https://` origin. Check the log stream if the app does not come up.
>
> Rate limits are kept in memory per instance. With several replicas each one counts separately; keep 1 replica or accept looser limits.

---

## 4. Step-by-Step Deployment with Azure CLI

### Step 1: Login and Create Resource Group
```bash
az login
az group create --name rg-voyage-prod --location eastus
```

### Step 2: Create Azure Cosmos DB for MongoDB (vCore)
```bash
# Provision a Cosmos DB vCore cluster (or create MongoDB Atlas via Azure Marketplace)
az cosmosdb mongocluster create \
  --cluster-name voyage-db \
  --resource-group rg-voyage-prod \
  --location eastus \
  --administrator-login voyageadmin \
  --administrator-login-password '<a-strong-unique-password>' \
  --node-count 1 \
  --sku M25
```
> **Note:** Retrieve your connection string from the Azure Portal and allow Azure services IP access.

### Step 3: Build and Deploy using Azure Container Apps

```bash
# 1. Create Azure Container Registry (ACR)
az acr create --resource-group rg-voyage-prod --name acrvoyageprod --sku Basic --admin-enabled true

# 2. Build image in ACR using the provided Dockerfile
az acr build --registry acrvoyageprod --image voyage:latest .

# 3. Create Container Apps Environment
az containerapp env create --name env-voyage --resource-group rg-voyage-prod --location eastus

# 4. Work out the app's public URL up front (production refuses to start without CORS_ORIGINS)
DOMAIN=$(az containerapp env show --name env-voyage --resource-group rg-voyage-prod --query properties.defaultDomain -o tsv)
echo "https://voyage-app.$DOMAIN"

# 5. Deploy Voyage Container App (secrets are stored as Container App secrets, not plain env vars)
az containerapp create \
  --name voyage-app \
  --resource-group rg-voyage-prod \
  --environment env-voyage \
  --image acrvoyageprod.azurecr.io/voyage:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server acrvoyageprod.azurecr.io \
  --cpu 0.5 --memory 1.0Gi \
  --min-replicas 1 --max-replicas 1 \
  --secrets \
    session-secret="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")" \
    mongodb-uri='<your-mongodb-connection-string>' \
  --env-vars \
    NODE_ENV=production \
    PORT=8080 \
    CLIENT_DIST_DIR=client/dist \
    TRUST_PROXY=1 \
    LOG_LEVEL=info \
    SESSION_TTL_HOURS=168 \
    CORS_ORIGINS="https://voyage-app.$DOMAIN" \
    SESSION_SECRET=secretref:session-secret \
    MONGODB_URI=secretref:mongodb-uri
```

### Alternative: Azure App Service (Linux, code deploy via GitHub Actions)

The workflow in [`.github/workflows/azure-deploy.yml`](../.github/workflows/azure-deploy.yml) lints, typechecks, tests and builds on every push and pull request, then deploys pushes to `main`. It uploads a prebuilt package (`package.json`, `server/dist`, `client/dist` and the server's production `node_modules` only).

```bash
az appservice plan create --name plan-voyage --resource-group rg-voyage-prod --is-linux --sku B1
az webapp create --name voyage-app --resource-group rg-voyage-prod --plan plan-voyage --runtime "NODE:22-lts"
az webapp config set --name voyage-app --resource-group rg-voyage-prod \
  --startup-file "npm start" --always-on true --http20-enabled true --min-tls-version 1.2 --ftps-state Disabled
az webapp update --name voyage-app --resource-group rg-voyage-prod --https-only true
az webapp config appsettings set --name voyage-app --resource-group rg-voyage-prod --settings \
  NODE_ENV=production CLIENT_DIST_DIR=client/dist TRUST_PROXY=1 LOG_LEVEL=info SESSION_TTL_HOURS=168 \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false \
  CORS_ORIGINS=https://voyage-app.azurewebsites.net \
  SESSION_SECRET='<48 random bytes, base64url>' \
  MONGODB_URI='<your-mongodb-connection-string>'
# Health check: Portal > voyage-app > Monitoring > Health check > path /api/v1/health
```

App Service sets `PORT` itself; do not override it. Then in GitHub: **Settings → Secrets and variables → Actions**, add `AZURE_WEBAPP_PUBLISH_PROFILE` (Portal → voyage-app → *Download publish profile*; basic auth publishing credentials must be enabled under Configuration → General settings), and set `AZURE_WEBAPP_NAME` at the top of the workflow to your app's name. If you add a custom domain, add its `https://` origin to `CORS_ORIGINS` (comma-separated).

### Step 4: Seed Initial Data
Once connected to the database, run the seed script to populate destination content and photo metadata:
```bash
# Option A: Run via local CLI pointing to the Azure DB
MONGODB_URI="<your-azure-mongodb-uri>" npm run seed -w server

# Option B: Run via one-off container execution in Azure
az containerapp exec --name voyage-app --resource-group rg-voyage-prod --command "node server/dist/seed/run.js"
```

---

## 5. Verification Checklist

1. **Health Endpoint:**  
   Navigate to `https://<your-app-domain>/api/v1/health`. You should receive:
   ```json
   {
     "status": "ok",
     "database": "connected"
   }
   ```
2. **Homepage & Interactive 3D:**  
   Visit `https://<your-app-domain>/`. Verify the 3D mountain and orb scene, 3D cartographic globe, search combobox, and Light/Dark mode toggle.
3. **Session Cookies:**  
   Sign up or log in. In browser DevTools > Application > Cookies, confirm cookie `__Host-voyage.sid` is marked with `Secure`, `HttpOnly`, and `SameSite=Lax`.

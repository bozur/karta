# Cloudflare Setup Guide for Karta.srb

This guide explains how to protect your Render-hosted application using Cloudflare. By routing traffic through Cloudflare, you gain **DDoS protection**, **Web Application Firewall (WAF)**, and **IP/Geo Blocking** capabilities without changing your application code.

## 1. Initial Setup (DNS Connection)

The goal is to place Cloudflare *in front* of your Render app.

1.  **Create an Account**: Go to [cloudflare.com](https://www.cloudflare.com/) and sign up (Free plan is sufficient).
2.  **Add Site**: Enter your domain name (`karta.srb` or whatever domain you own) and click **Add Site**.
3.  **Update Nameservers**: 
    *   Cloudflare will provide two nameservers (e.g., `bob.ns.cloudflare.com`, `alice.ns.cloudflare.com`).
    *   Go to your **Domain Registrar** (where you bought the domain, e.g., GoDaddy, Namecheap, RNIDS).
    *   Replace your current nameservers with the Cloudflare ones.
    *   Wait for propagation (usually 15-60 mins).

## 2. Pointing to Render

Once Cloudflare manages your DNS:

1.  Go to **DNS** > **Records** in Cloudflare.
2.  Add a **CNAME** record:
    *   **Type**: CNAME
    *   **Name**: `@` (or `www`)
    *   **Target**: Your Render sub-domain URL (e.g., `karta-srb.onrender.com`).
    *   **Proxy Status**: **Proxied** (Orange Cloud icon on). *This is crucial – if it is Grey, security features won't work.*

> **Note**: You may need to remove any existing A records if you are replacing an old server IP.

## 3. Configuring Security Rules

Now that traffic flows through Cloudflare, you can enable the protections requested.

### A. IP Blocking & Geofencing (Geo-Blocking)
1.  Go to **Security** > **WAF**.
2.  Click **Create Rule**.
3.  **Name**: "Block Bad Countries" (or similar).
4.  **Field**: `Country`.
5.  **Operator**: `is in`.
6.  **Value**: Select countries you want to BLOCK (e.g., China, Russia, etc.) OR select `is not in` and pick only "Serbia, Bosnia, Montenegro" to block everyone else.
7.  **Action**: `Block` (or `Managed Challenge` to give them a CAPTCHA first).
8.  **Deploy**.

### B. Blocking Known Bots
1.  Go to **Security** > **Bots**.
2.  Enable **Bot Fight Mode** (Free plan).
    *   This automatically challenges or blocks requests that match known bot patterns.

### C. Web Application Firewall (WAF)
1.  On the Free plan, Cloudflare provides a default "Managed Ruleset" that blocks common exploits (like SQL Injection attempts on URL parameters).
2.  Ensure this is enabled under **Security** > **WAF**.

## 4. SSL/TLS Configuration (Important!)

Render handles SSL automatically, and Cloudflare also handles SSL. To avoid "Too many redirects" errors:

1.  Go to **SSL/TLS** > **Overview**.
2.  Set encryption mode to **Full (Strict)**.
    *   **Full (Strict)**: Cloudflare enncrypts to user, AND verifies Render's valid SSL certificate. This is the securest and correct mode for Render apps.

---

## 5. Verification

1.  Visit your site. It should load normally.
2.  In Cloudflare dashboard, check **Analytics** > **Traffic** to see requests coming in.
3.  Check **Security** > **Events** to see if any bots or countries are being blocked.

## Summary

| Feature | Where Configured |
| :--- | :--- |
| **DDoS Protection** | Automatic (Just by being Proxied) |
| **Geo Blocking** | Security > WAF > Custom Rules |
| **Bot Blocking** | Security > Bots > Bot Fight Mode |
| **SQL Injection/XSS** | Security > WAF > Managed Rules |

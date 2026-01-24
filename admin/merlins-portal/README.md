# Merlin's Portal — Private Admin Dashboard

> *"The wizard's sanctum, where King Arthur commands the realm."*

## Overview

Merlin's Portal is the private administrative interface for the Excalibur $EXS Protocol. Only the Lead Architect (King Arthur) has access to these controls.

## Features

### 1. Treasury Monitoring
- Real-time tracking of Satoshi fees collected
- $EXS treasury balance and distribution history
- Fee analytics and revenue projections

### 2. Difficulty Adjustment
- Dynamic forge weight calibration
- Difficulty target modification (leading zero bytes)
- Historical difficulty charts

### 3. Global Anomaly Map
- Real-time forge tracking across the network
- Geographic distribution of miners
- Anomaly detection and security alerts

## Architecture

This dashboard is built as a secure web application with:
- **Backend**: Go-based API server
- **Frontend**: React with real-time WebSocket connections
- **Authentication**: Multi-factor authentication with hardware key support

## Access Control

Access to Merlin's Portal is restricted to:
- **Lead Architect**: Travis D. Jones (holedozer@icloud.com)

All access attempts are logged and monitored for security purposes.

## Deployment

The admin dashboard runs on a private server with the following security measures:
- VPN-only access
- IP whitelisting
- End-to-end encryption
- Regular security audits

---

*"With great power comes great responsibility."*

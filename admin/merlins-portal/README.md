# Merlin's Portal - Admin Dashboard

The private administrative interface for managing the Excalibur $EXS Protocol.

## 🎯 Purpose

Merlin's Portal serves as the command center for King Arthur (protocol administrators) to monitor and adjust the network.

## 📂 Files

- **index.html** - Main dashboard HTML structure
- **styles.css** - Royal-themed styling with purple and gold accents
- **dashboard.js** - Interactive dashboard functionality

## 🔑 Features

### 💰 Treasury Monitoring
- Real-time tracking of accumulated Satoshi fees (1% of all rewards)
- $EXS reserve balance display
- Treasury growth visualization over time
- Fee collection statistics

### ⚖️ Difficulty Adjustment
- Manual forge weight calibration (difficulty: 1-10)
- Current difficulty display
- Average forge time monitoring
- Network hash rate tracking
- Historical adjustment log

### 🗺️ Global Anomaly Map
- Visual representation of all active forges across the realm
- Real-time forge activity feed
- Filter by status (all/active/completed)
- Forge tracking and monitoring

## 🚀 Usage

### Local Development
```bash
# Navigate to the admin portal
cd admin/merlins-portal

# Open in browser (requires local web server for full functionality)
python -m http.server 8080

# Access at http://localhost:8080
```

### Access Control
⚠️ **Security Note**: In production, this dashboard should be protected by:
- Authentication (OAuth, JWT, or similar)
- IP whitelisting
- VPN/private network access
- Multi-factor authentication
- Role-based access control

## 🔐 Security Considerations

The admin portal should NEVER be publicly accessible. Implement proper authentication and authorization before deployment.

## 📊 Data Sources

In production, the dashboard would connect to:
- Treasury backend API (`pkg/economy/treasury.go`)
- Blockchain node for network statistics
- Forge monitoring service
- WebSocket for real-time updates

## 🎨 Design Philosophy

The design embodies the mystical nature of Merlin's wisdom combined with the power of King Arthur's authority:
- Royal purple and gold color scheme
- Clean, modern interface with medieval accents
- Real-time data visualization
- Intuitive controls for network management

---

*"With great power comes great responsibility"*

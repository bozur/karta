# How to Stop the Node Server

If Ctrl+C doesn't work in PowerShell, try these methods:

## Method 1: Task Manager
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Node.js: Server-side JavaScript"
3. Right-click → End Task

## Method 2: PowerShell Command
Run this command in a NEW PowerShell window:
```powershell
Get-Process -Name node | Stop-Process -Force
```

## Method 3: Find and Kill by Port
If server is running on port 3000:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

## Method 4: Close Terminal Window
Simply close the terminal window running npm start (this will kill all processes)

After stopping, restart with:
```powershell
npm start
```

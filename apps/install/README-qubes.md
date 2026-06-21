# Qubes OS Setup: Brave Browser for Chimera

This guide explains how to install Brave Browser in a Qubes OS environment so it is available to your Chimera AppVM, can be pinned as a startup application, and persists across sessions.

## How It Works in Qubes

- **TemplateVM**: Software is installed here. Changes survive AppVM restarts.
- **AppVM**: Applications from the template appear in the Qube menu. Startup apps are configured in Qube Settings and persist in the Qubes database.

## Quick Setup

### 1. Run the Setup Script in Your TemplateVM

Open a terminal in your TemplateVM (e.g., `fedora-40-xfce` or `debian-12-xfce`), then:

```bash
curl -fsSL https://raw.githubusercontent.com/TerexitariusStomp/qvac-chimera/main/apps/install/setup-brave-qubes.sh | bash
```

Or, if you have the repo cloned locally in your TemplateVM:

```bash
cd /path/to/qvac-chimera
bash apps/install/setup-brave-qubes.sh
```

The script auto-detects your distro (Debian/Ubuntu or Fedora/RHEL) and installs Brave from the official Brave repositories.

### 2. Shut Down the TemplateVM

```bash
qvm-shutdown --wait <template-name>
```

### 3. Restart Your Chimera AppVM

```bash
qvm-start <your-qube-name>
```

### 4. Pin Brave as a Startup App

1. Open **Qube Manager**.
2. Select your Chimera AppVM and click **Settings**.
3. Go to the **Applications** tab.
4. Find **Brave** in the *Available* list and move it to *Selected*.
5. In the **Startup applications** section at the bottom, add `brave-browser`.
6. *(Optional)* To have Brave open Chimera automatically on start, instead use:
   ```
   brave-browser --app=http://127.0.0.1:3002
   ```
7. Click **OK**.

## Persistence

Because Brave is installed in the **TemplateVM**, it persists across AppVM reboots. Because the startup app is configured in **Qube Settings**, it also persists across reboots. No manual reconfiguration is needed after the initial setup.

## Troubleshooting

- **Brave does not appear in the AppVM menu**: Make sure you shut down the TemplateVM completely and restarted the AppVM.
- **Startup app does not launch**: Check that the command is exactly `brave-browser` (or `brave-browser --app=http://127.0.0.1:3002`). Verify the AppVM has enough RAM allocated.
- **Updates**: To update Brave, run updates in the TemplateVM (`sudo dnf update` or `sudo apt update && sudo apt upgrade`), then shut down the template and restart the AppVM.

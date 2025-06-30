# SSH Connection Troubleshooting

This guide helps you troubleshoot SSH connection issues when using Cloudflare Access with the auto-deploy GitHub Action.

## 🔍 Common Issues and Solutions

### Issue: "Connection closed by UNKNOWN port 65535"

This error typically indicates a Cloudflare Access configuration problem.

#### **Step 1: Verify Cloudflare Access Configuration**

1. **Check CLOUDFLARE_HOSTNAME Secret**
   ```bash
   # The hostname should match exactly what's configured in Cloudflare Access
   # Example: ubuntu.aswinlocal.in
   ```

2. **Verify Cloudflare Access SSH is Enabled**
   - Go to Cloudflare Zero Trust Dashboard
   - Navigate to Access → Applications
   - Find your SSH application
   - Ensure SSH is enabled and configured

3. **Check Application Configuration**
   - Verify the application type is "SSH"
   - Ensure the correct hostname is configured
   - Check that the application is active

#### **Step 2: Test Cloudflare Access Locally**

Test the connection from your local machine:

```bash
# Test if you can connect manually
ssh -o ProxyCommand="cloudflared access ssh --hostname ubuntu.aswinlocal.in" aswin@ubuntu.aswinlocal.in
```

If this fails, the issue is with your Cloudflare Access setup.

#### **Step 3: Verify GitHub Secrets**

Check that all secrets are correctly set:

| Secret | What to Check |
|--------|---------------|
| `CLOUDFLARE_HOSTNAME` | Must match exactly: `ubuntu.aswinlocal.in` |
| `SSH_HOST` | Should be: `ubuntu.aswinlocal.in` |
| `SSH_USER` | Should be: `aswin` |
| `SSH_PASSWORD` | Your VM password |

#### **Step 4: Check VM SSH Service**

Ensure SSH is running on your VM:

```bash
# On your VM
sudo systemctl status ssh
sudo systemctl status sshd

# If not running, start it:
sudo systemctl start ssh
sudo systemctl enable ssh
```

#### **Step 5: Test Direct SSH (if possible)**

If you can access your VM directly (without Cloudflare Access):

```bash
# Test direct SSH connection
ssh aswin@YOUR_VM_IP
```

## 🔧 Alternative Solutions

### Option 1: Use SSH Keys Instead of Password

1. **Generate SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions"
   ```

2. **Add Public Key to VM**
   ```bash
   # Copy public key to VM
   ssh-copy-id -i ~/.ssh/id_ed25519.pub aswin@YOUR_VM_IP
   ```

3. **Update GitHub Secrets**
   - Add `SSH_PRIVATE_KEY` secret with the private key content
   - Remove `SSH_PASSWORD` secret

4. **Update Workflow**
   ```yaml
   env:
     SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
   ```

### Option 2: Use Different Cloudflare Access Method

If SSH over Cloudflare Access isn't working, consider:

1. **HTTP/HTTPS Tunnel**
   - Use Cloudflare Tunnel for HTTP access
   - Create a deployment API endpoint

2. **Direct Connection**
   - Use a VPN or direct network access
   - Configure firewall rules appropriately

## 🐛 Debugging Commands

### Test Cloudflare Access Configuration

```bash
# Test cloudflared installation
cloudflared --version

# Test access configuration
cloudflared access ssh --hostname ubuntu.aswinlocal.in --dry-run

# Test with verbose output
cloudflared access ssh --hostname ubuntu.aswinlocal.in --loglevel debug
```

### Test SSH Configuration

```bash
# Test SSH config
ssh -T vm-deploy

# Test with verbose output
ssh -vvv vm-deploy "echo test"

# Test specific hostname
ssh -o ProxyCommand="cloudflared access ssh --hostname ubuntu.aswinlocal.in" aswin@ubuntu.aswinlocal.in
```

## 📋 Checklist

- [ ] Cloudflare Access SSH application is configured
- [ ] CLOUDFLARE_HOSTNAME secret matches exactly
- [ ] SSH_USER and SSH_PASSWORD secrets are correct
- [ ] VM SSH service is running
- [ ] Cloudflare Access is accessible from GitHub Actions runners
- [ ] No firewall blocking the connection

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Cloudflare Access Logs**
   - Look for connection attempts in Cloudflare Zero Trust logs
   - Check for authentication failures

2. **Verify Network Configuration**
   - Ensure your VM is accessible via Cloudflare Access
   - Check if there are any network restrictions

3. **Test with Different Credentials**
   - Try creating a new Cloudflare Access application
   - Test with a different SSH user

4. **Contact Support**
   - If using Cloudflare Teams, contact Cloudflare support
   - Check Cloudflare Access documentation for updates 
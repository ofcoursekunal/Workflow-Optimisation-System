// Kills processes on ports 5000 and 5173 before dev server starts
const { execSync } = require('child_process');

const ports = [5000, 5173];

ports.forEach(port => {
  try {
    if (process.platform === 'win32') {
      // Windows: find PID using netstat, then kill it
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { shell: 'cmd', stdio: 'pipe' }
      ).toString();
      const lines = result.trim().split('\n');
      const pids = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) pids.add(pid);
      });
      pids.forEach(pid => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { shell: 'cmd', stdio: 'pipe' });
          console.log(`✓ Killed process on port ${port} (PID ${pid})`);
        } catch {}
      });
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'pipe' });
      console.log(`✓ Cleared port ${port}`);
    }
  } catch {
    // Port was already free
  }
});

console.log('🚀 Ports cleared — starting servers...\n');

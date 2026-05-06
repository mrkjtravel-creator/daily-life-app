import re

with open('src/data/gcal.js', 'r') as f:
    code = f.read()

sync_state_func = """
  let syncCount = 0;
  function _setSyncState(isSyncing) {
    if (isSyncing) {
      syncCount++;
      Store.set('syncStatus', 'syncing');
    } else {
      syncCount = Math.max(0, syncCount - 1);
      if (syncCount === 0) Store.set('syncStatus', 'synced');
    }
    const statusEl = document.getElementById('profile-status');
    if (statusEl) {
      const user = Store.get('user');
      if (!user) {
        statusEl.textContent = '未同步';
        statusEl.style.color = '#999';
      } else if (Store.get('syncStatus') === 'syncing') {
        statusEl.textContent = '↻ 同步中';
        statusEl.style.color = '#f39c12';
      } else {
        statusEl.textContent = '✓ 已同步';
        statusEl.style.color = 'var(--accent)';
      }
    }
  }
"""

code = code.replace("  let accessToken  = null;", "  let accessToken  = null;\n" + sync_state_func)

funcs = ['fetchUserInfo', 'fetchEvents', 'fetchTasks', 'createEvent', 'createTask', 'updateEvent', 'updateTask', 'deleteEvent', 'deleteTask']

for func in funcs:
    pattern = r'(async function ' + func + r'\b.*?\{)'
    replacement = r'\1\n    _setSyncState(true);\n    try {'
    
    code = re.sub(pattern, replacement, code, count=1, flags=re.DOTALL)
    
    # We need to find the matching closing brace and put `} finally { _setSyncState(false); }`
    # A simpler way is to replace `catch (err) {` with `catch (err) {` and then add `finally` at the very end of the function.
    # Wait, the functions already have `try/catch`. 
    # Let's just use `multi_replace_file_content` instead, it's safer than regex matching braces.

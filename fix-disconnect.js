const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/connected-accounts/page.tsx', 'utf8');
const oldCode = `const handleDisconnect = async (platform: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(\`/api/social-disconnect?platform=\${platform}\`, {`;
const newCode = `const handleDisconnect = async (platform: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;
    const apiPlatform = platform.startsWith('instagram-') ? 'instagram' : platform;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(\`/api/social-disconnect?platform=\${apiPlatform}\`, {`;
if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/app/dashboard/connected-accounts/page.tsx', content);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
  console.log('Looking for:', oldCode.substring(0, 100));
}

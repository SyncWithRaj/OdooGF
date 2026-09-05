const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000';
const imagePath = path.resolve(__dirname, '../icon.png');

async function main() {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`File not found at: ${imagePath}`);
  }

  const fileStats = fs.statSync(imagePath);
  console.log(`📸 Found root image: ${imagePath} (${fileStats.size} bytes)`);

  // 1. Log in to get token
  console.log('🔑 Authenticating as admin@dealflow.com...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@dealflow.com',
      password: 'Password123!' ? '123456' : '',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.accessToken;
  console.log('✅ Logged in successfully.');

  const fileBuffer = fs.readFileSync(imagePath);

  // 2. Upload as Avatar (PFP)
  console.log('\n📤 Uploading icon.png as Avatar (PFP)...');
  const avatarFormData = new FormData();
  const avatarBlob = new Blob([fileBuffer], { type: 'image/png' });
  avatarFormData.append('file', avatarBlob, 'icon.png');

  const avatarRes = await fetch(`${BASE_URL}/api/users/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: avatarFormData,
  });

  const avatarData = await avatarRes.json();
  if (!avatarRes.ok || !avatarData.avatarUrl) {
    throw new Error(`Avatar upload failed: ${JSON.stringify(avatarData)}`);
  }
  console.log('✅ Avatar Uploaded Successfully!');
  console.log('👉 Avatar MinIO URL:', avatarData.avatarUrl);

  // 3. Upload as Cover Banner
  console.log('\n📤 Uploading icon.png as Banner...');
  const bannerFormData = new FormData();
  const bannerBlob = new Blob([fileBuffer], { type: 'image/png' });
  bannerFormData.append('file', bannerBlob, 'icon.png');

  const bannerRes = await fetch(`${BASE_URL}/api/users/profile/banner`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: bannerFormData,
  });

  const bannerData = await bannerRes.json();
  if (!bannerRes.ok || !bannerData.bannerUrl) {
    throw new Error(`Banner upload failed: ${JSON.stringify(bannerData)}`);
  }
  console.log('✅ Banner Uploaded Successfully!');
  console.log('👉 Banner MinIO URL:', bannerData.bannerUrl);

  // 4. Verify MinIO direct HTTP GET for both
  console.log('\n🌐 Verifying direct access from MinIO S3...');
  const checkAvatar = await fetch(avatarData.avatarUrl);
  console.log(`Avatar GET -> Status: ${checkAvatar.status}, Content-Type: ${checkAvatar.headers.get('content-type')}, Size: ${checkAvatar.headers.get('content-length')} bytes`);

  const checkBanner = await fetch(bannerData.bannerUrl);
  console.log(`Banner GET -> Status: ${checkBanner.status}, Content-Type: ${checkBanner.headers.get('content-type')}, Size: ${checkBanner.headers.get('content-length')} bytes`);

  console.log('\n✨ RESULT JSON:');
  console.log(JSON.stringify({
    avatarUrl: avatarData.avatarUrl,
    bannerUrl: bannerData.bannerUrl,
    status: 'success'
  }, null, 2));
}

main().catch((err) => {
  console.error('❌ Upload test failed:', err);
  process.exit(1);
});

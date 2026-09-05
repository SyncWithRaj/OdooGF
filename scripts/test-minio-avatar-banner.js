const BASE_URL = 'http://localhost:4000';

async function run() {
  console.log('🚀 1. Logging in to get JWT token...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@dealflow.com',
      password: '123456',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.accessToken;
  console.log('✅ Logged in successfully. Token acquired.');

  // Create a minimal 1x1 PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  console.log('\n🚀 2. Uploading Avatar to /api/users/profile/avatar...');
  const avatarFormData = new FormData();
  const avatarBlob = new Blob([samplePngBuffer], { type: 'image/png' });
  avatarFormData.append('file', avatarBlob, 'avatar.png');

  const avatarRes = await fetch(`${BASE_URL}/api/users/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: avatarFormData,
  });

  const avatarData = await avatarRes.json();
  console.log('Avatar upload response:', avatarData);
  if (!avatarRes.ok || !avatarData.avatarUrl) {
    throw new Error(`Avatar upload failed: ${JSON.stringify(avatarData)}`);
  }
  console.log('✅ Avatar successfully uploaded! URL:', avatarData.avatarUrl);

  // Test downloading the avatar directly from MinIO
  console.log('\n🚀 3. Fetching Avatar directly from MinIO public URL...');
  const minioAvatarRes = await fetch(avatarData.avatarUrl);
  console.log('MinIO Avatar GET status:', minioAvatarRes.status, minioAvatarRes.headers.get('content-type'));
  if (minioAvatarRes.status !== 200) {
    throw new Error(`Failed to fetch avatar from MinIO: ${minioAvatarRes.status}`);
  }
  console.log('✅ MinIO directly served the avatar with HTTP 200 OK!');

  console.log('\n🚀 4. Uploading Banner to /api/users/profile/banner...');
  const bannerFormData = new FormData();
  const bannerBlob = new Blob([samplePngBuffer], { type: 'image/png' });
  bannerFormData.append('file', bannerBlob, 'banner.png');

  const bannerRes = await fetch(`${BASE_URL}/api/users/profile/banner`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: bannerFormData,
  });

  const bannerData = await bannerRes.json();
  console.log('Banner upload response:', bannerData);
  if (!bannerRes.ok || !bannerData.bannerUrl) {
    throw new Error(`Banner upload failed: ${JSON.stringify(bannerData)}`);
  }
  console.log('✅ Banner successfully uploaded! URL:', bannerData.bannerUrl);

  // Test downloading the banner directly from MinIO
  console.log('\n🚀 5. Fetching Banner directly from MinIO public URL...');
  const minioBannerRes = await fetch(bannerData.bannerUrl);
  console.log('MinIO Banner GET status:', minioBannerRes.status, minioBannerRes.headers.get('content-type'));
  if (minioBannerRes.status !== 200) {
    throw new Error(`Failed to fetch banner from MinIO: ${minioBannerRes.status}`);
  }
  console.log('✅ MinIO directly served the banner with HTTP 200 OK!');

  console.log('\n🚀 6. Verifying /api/users/profile contains saved URLs and details...');
  const profileRes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profileData = await profileRes.json();
  console.log('User profile:', {
    id: profileData.user.id,
    email: profileData.user.email,
    avatarUrl: profileData.user.avatarUrl,
    bannerUrl: profileData.user.bannerUrl,
  });

  if (profileData.user.avatarUrl !== avatarData.avatarUrl || profileData.user.bannerUrl !== bannerData.bannerUrl) {
    throw new Error('Avatar/Banner URLs mismatch in profile response!');
  }
  console.log('✅ Profile verification confirmed: MinIO URLs persisted in database!');

  console.log('\n🚀 7. Testing profile detail update via PATCH /api/users/profile...');
  const updateRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fullName: 'System Administrator',
      phone: '+1 (555) 999-8888',
      location: 'HQ - San Francisco, CA',
      teamName: 'Executive Leadership',
    }),
  });
  const updateData = await updateRes.json();
  console.log('Profile update result:', updateData);
  if (!updateRes.ok || updateData.user.phone !== '+1 (555) 999-8888') {
    throw new Error('Profile update failed');
  }
  console.log('✅ Profile details updated and saved successfully!');

  console.log('\n🎉 ALL MINIO PROFILE TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

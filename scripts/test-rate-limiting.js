const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function pass(name, detail = '') {
  console.log(`${colors.green}✔ [PASS]${colors.reset} ${name}${detail ? `\n  ↳ ${colors.cyan}${detail}${colors.reset}` : ''}`);
}

function fail(name, error) {
  console.error(`${colors.red}✖ [FAIL]${colors.reset} ${name}\n  ↳ ${colors.yellow}${error}${colors.reset}`);
}

const BASE_URL = 'http://localhost:4000';

async function testRateLimiting() {
  console.log(`\n${colors.bright}🛡️ === DEALFLOW360 REDIS RATE LIMITING TEST SUITE ===${colors.reset}\n`);

  // ==========================================================================
  // TEST 1: Health Check Exemption (@SkipRateLimit)
  // ==========================================================================
  console.log(`${colors.bright}--- TEST 1: Health Check Exemption (@SkipRateLimit) ---${colors.reset}`);
  let healthSuccessCount = 0;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status === 200) healthSuccessCount++;
  }

  if (healthSuccessCount === 15) {
    pass('Health check endpoint is exempt from rate limiting', `Sent 15 rapid requests -> All 15 succeeded (200 OK)`);
  } else {
    fail('Health check exemption failed', `Only ${healthSuccessCount}/15 succeeded`);
    process.exit(1);
  }

  // ==========================================================================
  // TEST 2: High-Security Auth Route Rate Limit (Limit: 5 requests / 60s)
  // ==========================================================================
  console.log(`\n${colors.bright}--- TEST 2: Auth Route Strict Throttling (5 req / 60s) ---${colors.reset}`);
  
  let lastLimitHeader = null;
  let lastRemainingHeader = null;
  let lastResetHeader = null;

  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-throttle@dealflow.com', password: 'wrongpassword' }),
    });

    lastLimitHeader = res.headers.get('x-ratelimit-limit');
    lastRemainingHeader = res.headers.get('x-ratelimit-remaining');
    lastResetHeader = res.headers.get('x-ratelimit-reset');

    console.log(`  Request #${i}: Status ${res.status} | X-RateLimit-Limit: ${lastLimitHeader} | Remaining: ${lastRemainingHeader}`);
  }

  if (lastLimitHeader === '5' && Number(lastRemainingHeader) <= 1) {
    pass('Standard RFC Headers Attached', `X-RateLimit-Limit: 5, X-RateLimit-Remaining decremented to ${lastRemainingHeader}, Reset: ${lastResetHeader}`);
  } else {
    fail('Headers check failed', `Expected limit 5 and remaining <= 1, got limit: ${lastLimitHeader}, remaining: ${lastRemainingHeader}`);
    process.exit(1);
  }

  // Request #6 should be blocked by RateLimitGuard with HTTP 429
  console.log(`  Sending Request #6 (should exceed limit)...`);
  const blockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test-throttle@dealflow.com', password: 'wrongpassword' }),
  });

  const blockedBody = await blockedRes.json();
  const retryAfterHeader = blockedRes.headers.get('retry-after');

  console.log(`  Request #6: Status ${blockedRes.status} | Body:`, blockedBody);

  if (blockedRes.status === 429 && blockedBody.statusCode === 429) {
    pass('Rate Limit Enforced (HTTP 429 Too Many Requests)', `Blocked with message: "${blockedBody.message}"`);
  } else {
    fail('Rate limit enforcement failed', `Expected HTTP 429, received ${blockedRes.status}`);
    process.exit(1);
  }

  if (retryAfterHeader || blockedBody.retryAfter) {
    pass('Retry-After Information Returned', `Retry-After header / property: ${retryAfterHeader || blockedBody.retryAfter}s`);
  } else {
    fail('Retry-After check failed', 'No Retry-After header found');
  }

  // ==========================================================================
  // TEST 3: General API Default Rate Limit (100 req / 60s)
  // ==========================================================================
  console.log(`\n${colors.bright}--- TEST 3: General API Global Rate Limit (100 req / 60s) ---${colors.reset}`);
  const generalRes = await fetch(`${BASE_URL}/api/products`);
  const genLimit = generalRes.headers.get('x-ratelimit-limit');
  const genRemaining = generalRes.headers.get('x-ratelimit-remaining');

  if (genLimit === '100') {
    pass('Global Default Rate Limit Applied', `X-RateLimit-Limit: 100, Remaining: ${genRemaining}`);
  } else {
    fail('Global default check failed', `Expected 100, got ${genLimit}`);
    process.exit(1);
  }

  console.log(`\n${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}${colors.bright}🎉 ALL REDIS RATE LIMITING TESTS PASSED SUCCESSFULLY! 🎉${colors.reset}`);
  console.log(`${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

testRateLimiting().catch((err) => {
  console.error('Test failed with unhandled exception:', err);
  process.exit(1);
});

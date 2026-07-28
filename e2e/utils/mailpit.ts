const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:18025';

export async function waitForEmailOtp(
  recipient: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:"${recipient}"`);

  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT_URL}/view/latest.txt?query=${query}`,
    );

    if (response.ok) {
      const email = await response.text();
      const otp = email.match(/\b\d{6}\b/)?.[0];

      if (otp) {
        return otp;
      }
    } else if (response.status !== 404) {
      throw new Error(
        `Mailpit returned ${response.status}: ${await response.text()}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`OTP email for ${recipient} was not received`);
}

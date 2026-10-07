/** @jest-environment node */
import { loadEmailTemplate, getAvailableEmailTypes } from './index';

it('renders every canonical template without unresolved placeholders, falling back to text when needed', async () => {
  for (const type of getAvailableEmailTypes()) {
    const rendered = await loadEmailTemplate(type as Parameters<typeof loadEmailTemplate>[0]);
    expect(rendered.html).toContain('<html');
    expect(rendered.text.length).toBeGreaterThan(100);
    expect(rendered.html + rendered.text).not.toMatch(/{{\w+}}/);
    expect(rendered.html + rendered.text).not.toContain('/unsubscribe?email=');
  }
});

it('escapes HTML but preserves literal dollar signs, zero and false in text', async () => {
  const rendered = await loadEmailTemplate('new_message', {
    senderName: '<img src=x onerror=alert(1)>$&',
    messagePreview: 0,
    meetingTitle: false,
  });
  expect(rendered.html).not.toContain('<img src=x');
  expect(rendered.html).toContain('&lt;img src=x onerror=alert(1)&gt;$&amp;');
  expect(rendered.text).toContain('<img src=x onerror=alert(1)>$&');
  expect(rendered.html).toContain('0');
});

it('rejects active-content URL protocols rather than merely escaping HTML', async () => {
  await expect(
    loadEmailTemplate('meeting_reminder', { meetingUrl: 'javascript:alert(1)' })
  ).rejects.toThrow('Unsafe email URL');
});
